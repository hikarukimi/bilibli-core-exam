import { Hono } from "hono";
import { createAnswerRoute, type AnswerRouteDeps } from "./routes/answer.ts";

export function createApp(deps: AnswerRouteDeps = {}): Hono {
  const app = new Hono();

  app.get("/health", (c) => c.json({ status: "ok" }));
  app.route("/", createAnswerRoute(deps));

  return app;
}
