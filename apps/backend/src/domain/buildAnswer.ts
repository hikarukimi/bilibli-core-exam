import type { AnswerDiagnostics, AnswerResponse, AnswerResult } from "./answerTypes.ts";
import type { MatchResult } from "./matchKnowledgeBase.ts";

export function buildAnswerFromKnowledge(
  requestId: string,
  match: MatchResult,
  elapsedMs: number,
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
    diagnostics: { matchedKnowledgeBase: true, modelUsed: false, elapsedMs },
  };
}

export function buildAnswerFromProvider(
  requestId: string,
  answer: AnswerResult,
  elapsedMs: number,
): AnswerResponse {
  return {
    requestId,
    status: answer.confidence === "low" ? "low_confidence" : "answered",
    answer,
    diagnostics: { matchedKnowledgeBase: false, modelUsed: true, elapsedMs },
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
