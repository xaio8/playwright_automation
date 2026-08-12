import type { PageContext, TestPlan } from "@ai-tester/shared";

export interface Screenshot {
  mimeType: string;
  /** Raw base64 (no data-URI prefix). */
  base64: string;
}

export interface GenerateTestPlanInput {
  page: PageContext;
  /** Attached only when the provider reports `capabilities.vision`. */
  screenshot?: Screenshot;
  /** Free-form user hints, e.g. "focus on the login form". */
  instructions?: string;
}

export interface ProviderCapabilities {
  vision: boolean;
  /** Provider can be asked for schema-constrained JSON output. */
  jsonSchema: boolean;
}

export interface AiProvider {
  readonly id: string;
  readonly defaultModel: string;
  readonly capabilities: ProviderCapabilities;
  generateTestPlan(
    input: GenerateTestPlanInput,
    signal?: AbortSignal,
  ): Promise<TestPlan>;
}

export interface ProviderConfig {
  id: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  /** Extra request headers, e.g. OpenRouter's attribution headers. */
  headers?: Record<string, string>;
}

export type ProviderFactory = (config: ProviderConfig) => AiProvider;

export type AiErrorKind = "provider_error" | "invalid_output" | "timeout";

export class AiError extends Error {
  readonly kind: AiErrorKind;

  constructor(kind: AiErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AiError";
    this.kind = kind;
  }
}
