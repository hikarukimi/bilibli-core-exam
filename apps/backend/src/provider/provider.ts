import type {
  AnswerOption,
  AnswerResult,
  AnswerSource,
  Confidence,
} from "../domain/answerTypes.ts";
import type { ModelConfig } from "./modelConfig.ts";

export type ModelProviderInput = {
  question?: string;
  options?: AnswerOption[];
  rawText: string;
};

export type ModelProviderResult = {
  answer: AnswerResult;
  question?: string;
  options?: AnswerOption[];
  modelRetries: number;
};

export interface ModelProvider {
  readonly name: string;
  generateAnswer(input: ModelProviderInput): Promise<ModelProviderResult>;
}

export const stubModelProvider: ModelProvider = {
  name: "stub",
  generateAnswer(input) {
    return Promise.resolve({
      answer: {
        optionId: input.options?.[0]?.id,
        text: input.options?.[0]?.text ?? "暂无候选答案",
        confidence: "low",
        rationale: "桩答案，依据不足：未接入真实模型与联网检索。",
        sourceType: "none",
        sources: [],
      },
      modelRetries: 0,
    });
  },
};

const SYSTEM_PROMPT =
  `你是 bilibili 会员答题助手。根据用户给出的题目文本（可能含 OCR 噪声）判断正确答案。
你可以使用联网搜索核实冷门动画、番剧、UP 主等事实。
只输出一个 JSON 对象，不要输出任何解释性文字，也不要使用 markdown 代码块。

JSON 字段：
- question: string，整理后的题干（去除 OCR 噪声）
- options: 数组，每项 {"id":"A","text":"选项文本"}；若题目无选项则为空数组
- optionId: string，所选选项 id（有选项时必填），无选项时为空字符串
- text: string，最终答案文本
- confidence: 必须是 "high" | "medium" | "low" 之一
- rationale: string，简短依据
- sources: 数组，每项 {"title":"标题","url":"链接"}；无来源则为空数组

confidence 规则：
- high：非常确定答案正确（有可靠来源或常识确凿）
- medium：较可能正确但不完全确定
- low：依据不足或难以判断

示例 1（有选项）：
输入：下列哪一部作品的主角是鲁路修？ A.火影忍者 B.Code Geass 反叛的鲁路修 C.银魂 D.CLANNAD
输出：{"question":"下列哪一部作品的主角是鲁路修？","options":[{"id":"A","text":"火影忍者"},{"id":"B","text":"Code Geass 反叛的鲁路修"},{"id":"C","text":"银魂"},{"id":"D","text":"CLANNAD"}],"optionId":"B","text":"Code Geass 反叛的鲁路修","confidence":"high","rationale":"鲁路修是《Code Geass》的男主角。","sources":[]}

示例 2（无选项）：
输入：bilibili 的吉祥物叫什么？
输出：{"question":"bilibili 的吉祥物叫什么？","options":[],"optionId":"","text":"2233 娘","confidence":"high","rationale":"bilibili 官方拟人形象为 22 娘和 33 娘，合称 2233 娘。","sources":[]}`;

const STRICT_SUFFIX =
  `\n\n重要：上一次的输出无法被解析为 JSON。请严格只输出一个合法的 JSON 对象，不要包含 markdown 代码块、注释或任何额外文字。`;

export function createGlmProvider(config: ModelConfig): ModelProvider {
  return {
    name: "glm",
    async generateAnswer(input) {
      const deadline = Date.now() + config.requestTimeoutMs;
      let retries = 0;
      for (const strict of [false, true]) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) break;
        const content = await callModel(config, input, strict, remaining);
        const result = parseAnswer(content, config.webSearch);
        if (result) return { ...result, modelRetries: retries };
        retries += 1;
      }
      throw new Error("模型返回无法解析为结构化答案。");
    },
  };
}

async function callModel(
  config: ModelConfig,
  input: ModelProviderInput,
  strict: boolean,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(buildPayload(config, input, strict)),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`GLM HTTP ${response.status}`);
    }
    const data = await response.json();
    return data?.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

function buildPayload(config: ModelConfig, input: ModelProviderInput, strict: boolean) {
  const payload: Record<string, unknown> = {
    model: config.model,
    temperature: config.temperature,
    messages: [
      { role: "system", content: strict ? SYSTEM_PROMPT + STRICT_SUFFIX : SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
  };
  if (config.webSearch) {
    payload.tools = [{ type: "web_search", web_search: { enable: true, search_result: true } }];
  }
  return payload;
}

function buildUserPrompt(input: ModelProviderInput): string {
  const parts: string[] = [];
  if (input.question) parts.push(`题干：${input.question}`);
  if (input.options?.length) {
    parts.push("选项：\n" + input.options.map((o) => `${o.id}. ${o.text}`).join("\n"));
  }
  parts.push(`OCR 原文：\n${input.rawText}`);
  return parts.join("\n\n");
}

function parseAnswer(
  content: string,
  webSearch: boolean,
): Omit<ModelProviderResult, "modelRetries"> | null {
  const parsed = extractJson(content);
  const text = str(parsed?.text);
  if (!parsed || !text) return null;

  const sources = normalizeSources(parsed.sources);
  const answer: AnswerResult = {
    optionId: str(parsed.optionId) || undefined,
    text,
    confidence: normalizeConfidence(parsed.confidence),
    rationale: str(parsed.rationale),
    sourceType: sources.length > 0 || webSearch ? "model_web" : "none",
    sources,
  };

  return {
    answer,
    question: str(parsed.question) || undefined,
    options: normalizeOptions(parsed.options),
  };
}

function extractJson(content: string): Record<string, unknown> | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeConfidence(value: unknown): Confidence {
  return value === "high" || value === "medium" || value === "low" ? value : "low";
}

function normalizeOptions(value: unknown): AnswerOption[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const options = value
    .map((item) => ({ id: str(item?.id), text: str(item?.text) }))
    .filter((item) => item.text);
  return options.length > 0 ? options : undefined;
}

function normalizeSources(value: unknown): AnswerSource[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({ title: str(item?.title), url: str(item?.url) || undefined }))
    .filter((item) => item.title);
}
