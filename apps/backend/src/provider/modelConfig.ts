export type ModelConfig = {
  baseUrl: string;
  model: string;
  webSearch: boolean;
  temperature: number;
  requestTimeoutMs: number;
  apiKey: string;
};

const defaultUrl = new URL("../../config/model.json", import.meta.url);

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

export async function loadModelConfig(source: URL = defaultUrl): Promise<ModelConfig> {
  const raw = JSON.parse(await Deno.readTextFile(source)) as Record<string, unknown>;
  const apiKeyEnv = asString(raw.apiKeyEnv, "GLM_API_KEY");
  return {
    baseUrl: asString(raw.baseUrl, "https://open.bigmodel.cn/api/paas/v4"),
    model: asString(raw.model, "glm-4-plus"),
    webSearch: raw.webSearch !== false,
    temperature: typeof raw.temperature === "number" ? raw.temperature : 0.2,
    requestTimeoutMs: typeof raw.requestTimeoutMs === "number" ? raw.requestTimeoutMs : 28000,
    apiKey: Deno.env.get(apiKeyEnv) ?? "",
  };
}
