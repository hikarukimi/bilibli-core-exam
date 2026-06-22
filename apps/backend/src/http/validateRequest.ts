import type { AnswerOption, AnswerRequest, ClientTiming } from "../domain/answerTypes.ts";

type ValidationError = {
  code: "EMPTY_TEXT" | "UNSUPPORTED_QUESTION_TYPE" | "INVALID_BODY";
  message: string;
};

export type ValidationResult =
  | { ok: true; request: AnswerRequest }
  | { ok: false; requestId: string; error: ValidationError };

function parseOptions(value: unknown): AnswerOption[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const options = value.filter(
    (item): item is AnswerOption =>
      !!item && typeof item.id === "string" && typeof item.text === "string",
  );
  return options.length > 0 ? options : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseClientContext(value: unknown): AnswerRequest["clientContext"] {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const timingRaw = raw.timing;
  let timing: ClientTiming | undefined;
  if (timingRaw && typeof timingRaw === "object") {
    const t = timingRaw as Record<string, unknown>;
    timing = {
      captureMs: num(t.captureMs),
      ocrMs: num(t.ocrMs),
      clientWaitMs: num(t.clientWaitMs),
    };
  }
  return {
    platform: typeof raw.platform === "string" ? raw.platform : undefined,
    appVersion: typeof raw.appVersion === "string" ? raw.appVersion : undefined,
    ocrEngine: typeof raw.ocrEngine === "string" ? raw.ocrEngine : undefined,
    timing,
  };
}

export function validateAnswerRequest(body: unknown): ValidationResult {
  const raw = (body ?? {}) as Record<string, unknown>;
  const requestId = typeof raw.requestId === "string" && raw.requestId
    ? raw.requestId
    : `backend-${Date.now()}`;
  const fail = (error: ValidationError): ValidationResult => ({ ok: false, requestId, error });

  if (!body || typeof body !== "object") {
    return fail({ code: "INVALID_BODY", message: "请求体格式不正确。" });
  }
  if (raw.scenario !== "bilibili_core_test") {
    return fail({ code: "UNSUPPORTED_QUESTION_TYPE", message: "暂不支持的题型或场景。" });
  }

  const rawText = typeof raw.rawText === "string" ? raw.rawText : "";
  const question = typeof raw.question === "string" ? raw.question.trim() : undefined;
  const options = parseOptions(raw.options);

  if (!rawText.trim() && !question && !options) {
    return fail({ code: "EMPTY_TEXT", message: "请求没有可用题目文本。" });
  }

  return {
    ok: true,
    request: {
      requestId,
      scenario: "bilibili_core_test",
      rawText,
      question: question || undefined,
      options,
      clientContext: parseClientContext(raw.clientContext),
    },
  };
}
