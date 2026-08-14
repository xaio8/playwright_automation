import OpenAI from "openai";
import { AiError, type ProviderConfig } from "./provider.js";

export interface ChatTextPart {
  type: "text";
  text: string;
}

export interface ChatImagePart {
  type: "image_url";
  image_url: { url: string };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<ChatTextPart | ChatImagePart>;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  /** Requests schema-constrained JSON when the provider supports it. */
  jsonSchema?: { name: string; schema: unknown };
  signal?: AbortSignal;
}

/**
 * Minimal chat abstraction so providers can be unit-tested without network and
 * so non-OpenAI wire formats can be plugged in later.
 */
export interface ChatClient {
  complete(request: ChatRequest): Promise<string>;
}

/** Works with any OpenAI-wire-compatible endpoint (OpenRouter, Ollama, ...). */
export class OpenAiChatClient implements ChatClient {
  private readonly client: OpenAI;

  constructor(config: ProviderConfig) {
    if (!config.apiKey) {
      throw new AiError(
        "provider_error",
        `Provider "${config.id}" is missing an API key`,
      );
    }

    this.client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      // defaultHeaders: config.headers,
    });
  }

  async complete(request: ChatRequest): Promise<string> {
    try {
      const response = await this.client.chat.completions.create(
        {
          model: request.model,
          messages: request.messages as never,
          ...(request.jsonSchema
            ? {
                response_format: {
                  type: "json_schema" as const,
                  json_schema: {
                    name: request.jsonSchema.name,
                    schema: request.jsonSchema.schema as Record<
                      string,
                      unknown
                    >,
                    strict: false,
                  },
                },
              }
            : {}),
        },
        { signal: request.signal },
      );

      return response.choices[0]?.message?.content ?? "";
    } catch (error) {
      if (error instanceof AiError) {
        throw error;
      }

      const aborted = error instanceof Error && error.name === "AbortError";

      throw new AiError(
        aborted ? "timeout" : "provider_error",
        error instanceof Error ? error.message : String(error),
        { cause: error },
      );
    }
  }
}
