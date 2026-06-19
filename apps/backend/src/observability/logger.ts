export type AnswerLogRecord = {
  requestId: string;
  timestamp: string;
  questionText: string;
  matchedKnowledgeBase: boolean;
  modelUsed: boolean;
  modelSucceeded: boolean;
  elapsedMs: number;
  confidence?: string;
  failureReason?: string;
};

export function logAnswerRequest(record: AnswerLogRecord): void {
  console.log(JSON.stringify({ kind: "answer_request", ...record }));
}
