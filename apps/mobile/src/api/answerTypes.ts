export type Confidence = 'high' | 'medium' | 'low';

export type AnswerStatus = 'answered' | 'low_confidence' | 'not_found' | 'failed';

export type AnswerOption = {
  id: string;
  text: string;
};

export type AnswerRequest = {
  requestId: string;
  scenario: 'bilibili_core_test';
  rawText: string;
  question?: string;
  options?: AnswerOption[];
  clientContext: {
    platform: 'android';
    appVersion: string;
    ocrEngine: 'mlkit';
  };
};

export type AnswerResult = {
  optionId?: string;
  text: string;
  confidence: Confidence;
  rationale: string;
  sourceType: 'knowledge_base' | 'model_web' | 'mixed' | 'none';
  sources: Array<{
    title: string;
    url?: string;
    snippet?: string;
  }>;
};

export type AnswerResponse = {
  requestId: string;
  status: AnswerStatus;
  answer?: AnswerResult;
  error?: {
    code: string;
    message: string;
  };
  diagnostics?: {
    matchedKnowledgeBase: boolean;
    modelUsed: boolean;
    elapsedMs: number;
  };
};
