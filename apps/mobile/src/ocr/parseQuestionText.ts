import {AnswerOption} from '../api/answerTypes';

export type ParsedQuestionText = {
  rawText: string;
  question?: string;
  options?: AnswerOption[];
};

const optionPattern = /^([A-Da-d])[\s.、:：)]*(.+)$/;

export function parseQuestionText(rawText: string): ParsedQuestionText {
  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const options: AnswerOption[] = [];
  const questionLines: string[] = [];

  for (const line of lines) {
    const match = line.match(optionPattern);
    if (match) {
      options.push({
        id: match[1].toUpperCase(),
        text: match[2].trim(),
      });
      continue;
    }

    questionLines.push(line);
  }

  return {
    rawText,
    question: questionLines.join(' ') || undefined,
    options: options.length > 0 ? options : undefined,
  };
}
