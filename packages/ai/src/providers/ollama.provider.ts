import { OpenAiCompatibleProvider } from "../openai-compatible.provider.js";
import type { ChatClient } from "../chat-client.js";
import type { ProviderConfig } from "../provider.js";

export const OLLAMA_ID = "ollama";
export const OLLAMA_DEFAULT_MODEL = "qwen2.5-coder:14b";

/** Local Ollama exposes an OpenAI-compatible endpoint and needs no real key. */
export function createOllamaProvider(
  config: ProviderConfig,
  client?: ChatClient,
): OpenAiCompatibleProvider {
  return new OpenAiCompatibleProvider({
    id: OLLAMA_ID,
    defaultModel: OLLAMA_DEFAULT_MODEL,
    capabilities: { vision: false, jsonSchema: false },
    config: {
      ...config,
      apiKey: config.apiKey ?? "ollama",
      baseUrl: config.baseUrl ?? "http://127.0.0.1:11434/v1",
    },
    client,
  });
}
