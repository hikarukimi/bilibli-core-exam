export type Confidence = "high" | "medium" | "low";

export type AnswerStatus = "answered" | "low_confidence" | "not_found" | "failed";

export type SourceType = "knowledge_base" | "model_web" | "mixed" | "none";

export type AnswerOption = {
  id: string;
  text: string;
};

export type AnswerRequest = {
  requestId: string;
  scenario: "bilibili_core_test";
  rawText: string;
  question?: string;
  options?: AnswerOption[];
  clientContext?: {
    platform?: string;
    appVersion?: string;
    ocrEngine?: string;
  };
};

export type AnswerSource = {
  title: string;
  url?: string;
  snippet?: string;
};

export type AnswerResult = {
  optionId?: string;
  text: string;
  confidence: Confidence;
  rationale: string;
  sourceType: SourceType;
  sources: AnswerSource[];
};

export type AnswerDiagnostics = {
  matchedKnowledgeBase: boolean;
  modelUsed: boolean;
  elapsedMs: number;
};

export type AnswerError = {
  code: string;
  message: string;
};

export type AnswerResponse = {
  requestId: string;
  status: AnswerStatus;
  answer?: AnswerResult;
  error?: AnswerError;
  diagnostics?: AnswerDiagnostics;
};
