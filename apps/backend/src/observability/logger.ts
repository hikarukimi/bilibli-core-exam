import type { AnswerTiming } from "../domain/answerTypes.ts";

export type AnswerLogRecord = {
  requestId: string;
  timestamp: string;
  questionText: string;
  matchedKnowledgeBase: boolean;
  modelUsed: boolean;
  modelSucceeded: boolean;
  modelRetries?: number;
  elapsedMs: number;
  timing?: AnswerTiming;
  confidence?: string;
  failureReason?: string;
};

const SLOW_THRESHOLD_MS = 5000;

export function logAnswerRequest(record: AnswerLogRecord): void {
  console.log(JSON.stringify({ kind: "answer_request", ...record }));
  if (isSlow(record)) {
    console.warn(JSON.stringify({ kind: "slow_request", ...record }));
  }
}

function isSlow(record: AnswerLogRecord): boolean {
  const total = record.timing?.totalServerMs ?? record.elapsedMs;
  return record.modelUsed || total > SLOW_THRESHOLD_MS;
}
