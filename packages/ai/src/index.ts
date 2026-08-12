import { registerProvider } from "./registry.js";
import {
  OLLAMA_ID,
  createOllamaProvider,
} from "./providers/ollama.provider.js";
import { OPENAI_ID, createOpenAiProvider } from "./providers/openai.provider.js";
import {
  OPENROUTER_ID,
  createOpenRouterProvider,
} from "./providers/openrouter.provider.js";
import { MOCK_ID, MockProvider } from "./providers/mock.provider.js";

export * from "./provider.js";
export * from "./chat-client.js";
export * from "./registry.js";
export * from "./parse.js";
export * from "./prompt.js";
export * from "./openai-compatible.provider.js";
export * from "./providers/openrouter.provider.js";
export * from "./providers/openai.provider.js";
export * from "./providers/ollama.provider.js";
export * from "./providers/mock.provider.js";

registerProvider(OPENROUTER_ID, (config) => createOpenRouterProvider(config));
registerProvider(OPENAI_ID, (config) => createOpenAiProvider(config));
registerProvider(OLLAMA_ID, (config) => createOllamaProvider(config));
registerProvider(MOCK_ID, () => new MockProvider());
