import { createApp } from "./app.ts";
import { loadModelConfig } from "./provider/modelConfig.ts";
import { createGlmProvider, stubModelProvider } from "./provider/provider.ts";

const port = Number(Deno.env.get("PORT") ?? "8000");

const modelConfig = await loadModelConfig();
const provider = modelConfig.apiKey ? createGlmProvider(modelConfig) : stubModelProvider;
if (!modelConfig.apiKey) {
  console.warn(
    JSON.stringify({ kind: "provider_fallback", message: "未配置 GLM_API_KEY，使用桩 Provider。" }),
  );
}

const app = createApp({ provider });

Deno.serve({ port }, app.fetch);
