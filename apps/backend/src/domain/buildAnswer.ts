import type {
  AnswerDiagnostics,
  AnswerResponse,
  AnswerResult,
  AnswerTiming,
} from "./answerTypes.ts";
import type { MatchResult } from "./matchKnowledgeBase.ts";

export type DiagnosticsExtra = {
  timing?: AnswerTiming;
  modelRetries?: number;
};

export function buildAnswerFromKnowledge(
  requestId: string,
  match: MatchResult,
  elapsedMs: number,
  extra: DiagnosticsExtra = {},
): AnswerResponse {
  const { entry, confidence } = match;
  return {
    requestId,
    status: confidence === "low" ? "low_confidence" : "answered",
    answer: {
      optionId: entry.answerOptionId,
      text: entry.answerText,
      confidence,
      rationale: entry.explanation,
      sourceType: "knowledge_base",
      sources: entry.sources,
    },
    diagnostics: {
      matchedKnowledgeBase: true,
      modelUsed: false,
      elapsedMs,
      ...extra,
    },
  };
}

export function buildAnswerFromProvider(
  requestId: string,
  answer: AnswerResult,
  elapsedMs: number,
  extra: DiagnosticsExtra = {},
): AnswerResponse {
  return {
    requestId,
    status: answer.confidence === "low" ? "low_confidence" : "answered",
    answer,
    diagnostics: {
      matchedKnowledgeBase: false,
      modelUsed: true,
      elapsedMs,
      ...extra,
    },
  };
}

export function buildFailure(
  code: string,
  message: string,
  requestId = `backend-${Date.now()}`,
  diagnostics?: AnswerDiagnostics,
): AnswerResponse {
  return { requestId, status: "failed", error: { code, message }, diagnostics };
}
