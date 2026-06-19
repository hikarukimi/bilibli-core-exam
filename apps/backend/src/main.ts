import { createApp } from "./app.ts";

const port = Number(Deno.env.get("PORT") ?? "8000");
const app = createApp();

Deno.serve({ port }, app.fetch);
