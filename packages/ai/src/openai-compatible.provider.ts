import type { TestPlan } from "@ai-tester/shared";
import {
  OpenAiChatClient,
  type ChatClient,
  type ChatMessage,
} from "./chat-client.js";
import { parseTestPlan } from "./parse.js";
import {
  SYSTEM_PROMPT,
  buildRepairPrompt,
  buildUserPrompt,
  testPlanJsonSchema,
} from "./prompt.js";
import {
  AiError,
  type AiProvider,
  type GenerateTestPlanInput,
  type ProviderCapabilities,
  type ProviderConfig,
} from "./provider.js";

export interface OpenAiCompatibleOptions {
  id: string;
  defaultModel: string;
  capabilities: ProviderCapabilities;
  config: ProviderConfig;
  /** Injectable for tests; defaults to the OpenAI-wire HTTP client. */
  client?: ChatClient;
}

/**
 * Shared implementation for every OpenAI-wire-compatible gateway. Owns prompt
 * assembly, optional vision input and the one-shot repair retry on invalid
 * output, so concrete providers only supply ids, models and capabilities.
 */
export class OpenAiCompatibleProvider implements AiProvider {
  readonly id: string;
  readonly defaultModel: string;
  readonly capabilities: ProviderCapabilities;

  private readonly model: string;
  private readonly client: ChatClient;

  constructor(options: OpenAiCompatibleOptions) {
    this.id = options.id;
    this.defaultModel = options.defaultModel;
    this.capabilities = options.capabilities;
    this.model = options.config.model ?? options.defaultModel;
    this.client = options.client ?? new OpenAiChatClient(options.config);
  }

  async generateTestPlan(
    input: GenerateTestPlanInput,
    signal?: AbortSignal,
  ): Promise<TestPlan> {
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: this.buildUserContent(input) },
    ];

    const jsonSchema = this.capabilities.jsonSchema
      ? { name: "test_plan", schema: testPlanJsonSchema }
      : undefined;

    const first = await this.client.complete({
      model: this.model,
      messages,
      jsonSchema,
      signal,
    });

    try {
      return parseTestPlan(first);
    } catch (error) {
      if (!(error instanceof AiError) || error.kind !== "invalid_output") {
        throw error;
      }

      const repaired = await this.client.complete({
        model: this.model,
        messages: [
          ...messages,
          { role: "assistant", content: first },
          { role: "user", content: buildRepairPrompt(first, error.message) },
        ],
        jsonSchema,
        signal,
      });

      return parseTestPlan(repaired);
    }
  }

  private buildUserContent(
    input: GenerateTestPlanInput,
  ): ChatMessage["content"] {
    const text = buildUserPrompt(input);

    if (!input.screenshot || !this.capabilities.vision) {
      return text;
    }

    return [
      { type: "text", text },
      {
        type: "image_url",
        image_url: {
          url: `data:${input.screenshot.mimeType};base64,${input.screenshot.base64}`,
        },
      },
    ];
  }
}
