import type { AnswerOption, Confidence } from "./answerTypes.ts";
import type { KnowledgeEntry } from "../knowledge/loadKnowledgeBase.ts";

export type MatchInput = {
  question?: string;
  options?: AnswerOption[];
  rawText: string;
};

export type MatchResult = {
  entry: KnowledgeEntry;
  confidence: Confidence;
  questionScore: number;
  optionOverlap: number;
};

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[\p{P}\p{S}]/gu, "");
}

function bigrams(value: string): Set<string> {
  const grams = new Set<string>();
  for (let i = 0; i < value.length - 1; i++) {
    grams.add(value.slice(i, i + 2));
  }
  if (value.length === 1) {
    grams.add(value);
  }
  return grams;
}

export function similarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const ga = bigrams(na);
  const gb = bigrams(nb);
  let intersection = 0;
  for (const gram of ga) {
    if (gb.has(gram)) intersection++;
  }
  const union = ga.size + gb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function optionOverlap(
  input: AnswerOption[] | undefined,
  entry: KnowledgeEntry,
): number {
  if (!input || input.length === 0) return 0;
  const entryTexts = entry.options.map((o) => normalizeText(o.text));
  let matched = 0;
  for (const opt of input) {
    const normalized = normalizeText(opt.text);
    if (entryTexts.some((t) => t === normalized)) {
      matched++;
    }
  }
  return matched / entry.options.length;
}

export function matchKnowledgeBase(
  input: MatchInput,
  entries: KnowledgeEntry[],
): MatchResult | undefined {
  const query = input.question?.trim() || input.rawText;

  let best: MatchResult | undefined;
  for (const entry of entries) {
    const questionScore = similarity(query, entry.question);
    const overlap = optionOverlap(input.options, entry);
    const confidence = classify(questionScore, overlap, input.options);

    if (!confidence) continue;

    const candidate: MatchResult = {
      entry,
      confidence,
      questionScore,
      optionOverlap: overlap,
    };

    if (!best || rank(candidate) > rank(best)) {
      best = candidate;
    }
  }

  return best;
}

function rank(result: MatchResult): number {
  const weight = { high: 3, medium: 2, low: 1 }[result.confidence];
  return weight * 100 + result.questionScore * 10 + result.optionOverlap;
}

function classify(
  questionScore: number,
  overlap: number,
  options: AnswerOption[] | undefined,
): Confidence | undefined {
  const hasOptions = !!options && options.length > 0;

  if (questionScore >= 0.95 && (!hasOptions || overlap >= 0.99)) {
    return "high";
  }
  if (questionScore >= 0.7 && (!hasOptions || overlap >= 0.5)) {
    return "medium";
  }
  if (questionScore >= 0.7) {
    return "low";
  }
  return undefined;
}
