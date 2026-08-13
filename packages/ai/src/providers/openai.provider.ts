import { OpenAiCompatibleProvider } from "../openai-compatible.provider.js";
import type { ChatClient } from "../chat-client.js";
import type { ProviderConfig } from "../provider.js";

export const OPENAI_ID = "openai";
export const OPENAI_DEFAULT_MODEL = "gpt-4.1-mini";

export function createOpenAiProvider(
  config: ProviderConfig,
  client?: ChatClient,
): OpenAiCompatibleProvider {
  return new OpenAiCompatibleProvider({
    id: OPENAI_ID,
    defaultModel: OPENAI_DEFAULT_MODEL,
    capabilities: { vision: true, jsonSchema: true },
    config,
    client,
  });
}
