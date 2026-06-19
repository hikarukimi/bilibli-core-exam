import { Hono } from "hono";
import type { AnswerResponse } from "../domain/answerTypes.ts";
import {
  buildAnswerFromKnowledge,
  buildAnswerFromProvider,
  buildFailure,
} from "../domain/buildAnswer.ts";
import { matchKnowledgeBase } from "../domain/matchKnowledgeBase.ts";
import {
  KnowledgeBaseError,
  type KnowledgeEntry,
  loadKnowledgeBase,
} from "../knowledge/loadKnowledgeBase.ts";
import { type ModelProvider, stubModelProvider } from "../provider/provider.ts";
import { validateAnswerRequest } from "../http/validateRequest.ts";
import { logAnswerRequest } from "../observability/logger.ts";

export type AnswerRouteDeps = {
  loadEntries?: () => Promise<KnowledgeEntry[]>;
  provider?: ModelProvider;
};

export function createAnswerRoute(deps: AnswerRouteDeps = {}): Hono {
  const loadEntries = deps.loadEntries ?? loadKnowledgeBase;
  const provider = deps.provider ?? stubModelProvider;
  const app = new Hono();

  app.post("/api/answer", async (c) => {
    const startedAt = performance.now();

    const body = await c.req.json().catch(() => null);
    if (body === null) {
      return c.json(buildFailure("INVALID_BODY", "请求体不是合法 JSON。"), 400);
    }

    const validation = validateAnswerRequest(body);
    if (!validation.ok) {
      const { code, message } = validation.error;
      return c.json(buildFailure(code, message, validation.requestId), 400);
    }

    const { request } = validation;
    const questionText = request.question?.trim() || request.rawText;
    const elapsed = () => Math.round(performance.now() - startedAt);

    const respond = (response: AnswerResponse) => {
      logAnswerRequest({
        requestId: response.requestId,
        timestamp: new Date().toISOString(),
        questionText,
        matchedKnowledgeBase: response.diagnostics?.matchedKnowledgeBase ?? false,
        modelUsed: response.diagnostics?.modelUsed ?? false,
        modelSucceeded: response.status !== "failed",
        elapsedMs: response.diagnostics?.elapsedMs ?? elapsed(),
        confidence: response.answer?.confidence,
        failureReason: response.error?.code,
      });
      return c.json(response, httpStatusFor(response));
    };

    let entries: KnowledgeEntry[];
    try {
      entries = await loadEntries();
    } catch (cause) {
      const code = cause instanceof KnowledgeBaseError
        ? "KNOWLEDGE_BASE_ERROR"
        : "INTERNAL_ERROR";
      return respond(
        buildFailure(code, "知识库加载或查询失败。", request.requestId, {
          matchedKnowledgeBase: false,
          modelUsed: false,
          elapsedMs: elapsed(),
        }),
      );
    }

    const match = matchKnowledgeBase(request, entries);
    if (match) {
      return respond(buildAnswerFromKnowledge(request.requestId, match, elapsed()));
    }

    try {
      const { answer } = await provider.generateAnswer(request);
      return respond(buildAnswerFromProvider(request.requestId, answer, elapsed()));
    } catch {
      return respond(
        buildFailure("MODEL_ERROR", "模型服务调用失败。", request.requestId, {
          matchedKnowledgeBase: false,
          modelUsed: true,
          elapsedMs: elapsed(),
        }),
      );
    }
  });

  return app;
}

function httpStatusFor(response: AnswerResponse): 200 | 400 | 500 | 502 {
  if (response.status !== "failed") return 200;
  switch (response.error?.code) {
    case "KNOWLEDGE_BASE_ERROR":
    case "INTERNAL_ERROR":
      return 500;
    case "MODEL_ERROR":
      return 502;
    default:
      return 400;
  }
}
