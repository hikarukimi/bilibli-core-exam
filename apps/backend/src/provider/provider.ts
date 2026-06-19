import type { AnswerResult } from "../domain/answerTypes.ts";

export type ModelProviderInput = {
  question?: string;
  options?: { id: string; text: string }[];
  rawText: string;
};

export interface ModelProvider {
  readonly name: string;
  generateAnswer(input: ModelProviderInput): Promise<{ answer: AnswerResult }>;
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
    });
  },
};
