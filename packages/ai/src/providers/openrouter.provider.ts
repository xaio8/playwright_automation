import { OpenAiCompatibleProvider } from "../openai-compatible.provider.js";
import type { ChatClient } from "../chat-client.js";
import type { ProviderConfig } from "../provider.js";

export const OPENROUTER_ID = "openrouter";
export const OPENROUTER_DEFAULT_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";

export function createOpenRouterProvider(
  config: ProviderConfig,
  client?: ChatClient,
): OpenAiCompatibleProvider {
  return new OpenAiCompatibleProvider({
    id: OPENROUTER_ID,
    defaultModel: OPENROUTER_DEFAULT_MODEL,
    capabilities: { vision: true, jsonSchema: true },
    config: {
      ...config,
      baseUrl: config.baseUrl ?? "https://openrouter.ai/api/v1",
      headers: {
        "HTTP-Referer": "https://github.com/xaio8/playwright_automation",
        "X-Title": "AI Playwright Tester",
        ...config.headers,
      },
    },
    client,
  });
}
