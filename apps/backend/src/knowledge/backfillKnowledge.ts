import type { AnswerOption, AnswerResult } from "../domain/answerTypes.ts";
import { type KnowledgeEntry, loadKnowledgeBase } from "./loadKnowledgeBase.ts";
import { normalizeText } from "../domain/matchKnowledgeBase.ts";

const defaultUrl = new URL("./knowledge-base.json", import.meta.url);

let writeChain: Promise<void> = Promise.resolve();

export type BackfillInput = {
  answer: AnswerResult;
  question?: string;
  options?: AnswerOption[];
};

export function backfillKnowledge(input: BackfillInput, target: URL = defaultUrl): void {
  if (input.answer.confidence !== "high") return;
  const question = input.question?.trim();
  if (!question) return;

  writeChain = writeChain
    .then(() => appendEntry(question, input, target))
    .catch((cause) => {
      console.error(JSON.stringify({ kind: "backfill_failed", message: (cause as Error).message }));
    });
}

async function appendEntry(question: string, input: BackfillInput, target: URL): Promise<void> {
  const entries = await loadKnowledgeBase(target);
  const key = normalizeText(question);
  if (entries.some((e) => normalizeText(e.question) === key)) return;

  const options = input.options ?? [];
  const entry: KnowledgeEntry = {
    id: `auto-${Date.now()}`,
    question,
    options,
    answerOptionId: input.answer.optionId ?? "",
    answerText: input.answer.text,
    explanation: input.answer.rationale,
    sources: input.answer.sources,
    tags: ["auto"],
  };

  entries.push(entry);
  await Deno.writeTextFile(target, JSON.stringify(entries, null, 2) + "\n");
}
