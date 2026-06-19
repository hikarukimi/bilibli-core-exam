import type { AnswerOption, AnswerSource } from "../domain/answerTypes.ts";

export type KnowledgeEntry = {
  id: string;
  question: string;
  options: AnswerOption[];
  answerOptionId: string;
  answerText: string;
  explanation: string;
  sources: AnswerSource[];
  tags: string[];
};

export class KnowledgeBaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KnowledgeBaseError";
  }
}

function isValidEntry(value: unknown): value is KnowledgeEntry {
  if (!value || typeof value !== "object") {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.question === "string" &&
    Array.isArray(entry.options) &&
    typeof entry.answerOptionId === "string" &&
    typeof entry.answerText === "string"
  );
}

const defaultUrl = new URL("./knowledge-base.json", import.meta.url);

export async function loadKnowledgeBase(
  source: URL = defaultUrl,
): Promise<KnowledgeEntry[]> {
  let text: string;
  try {
    text = await Deno.readTextFile(source);
  } catch (cause) {
    throw new KnowledgeBaseError(
      `无法读取知识库文件: ${(cause as Error).message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    throw new KnowledgeBaseError(
      `知识库文件 JSON 解析失败: ${(cause as Error).message}`,
    );
  }

  if (!Array.isArray(parsed) || !parsed.every(isValidEntry)) {
    throw new KnowledgeBaseError("知识库文件结构不合法。");
  }

  return parsed;
}
