import {
  AiError,
  type AiProvider,
  type ProviderConfig,
  type ProviderFactory,
} from "./provider.js";

const factories = new Map<string, ProviderFactory>();

/** Adding a provider is one `registerProvider` call; no other package changes. */
export function registerProvider(id: string, factory: ProviderFactory): void {
  factories.set(id, factory);
}

export function listProviderIds(): string[] {
  return [...factories.keys()];
}

export function createProvider(config: ProviderConfig): AiProvider {
  const factory = factories.get(config.id);

  if (!factory) {
    throw new AiError(
      "provider_error",
      `Unknown AI provider "${config.id}". Registered: ${listProviderIds().join(", ")}`,
    );
  }

  return factory(config);
}

/**
 * Reads provider selection from the environment. The API key is looked up as
 * `<PROVIDER_ID>_API_KEY` (uppercased), e.g. `OPENROUTER_API_KEY`, so a new
 * provider needs no changes here either.
 */
export function configFromEnv(
  env: Record<string, string | undefined> = process.env,
  overrides: Partial<ProviderConfig> = {},
): ProviderConfig {
  const id = overrides.id ?? env.AI_PROVIDER ?? "openrouter";
  const envPrefix = id.toUpperCase().replace(/[^A-Z0-9]/g, "_");

  return {
    id,
    apiKey: overrides.apiKey ?? env[`${envPrefix}_API_KEY`],
    model: overrides.model ?? env.AI_MODEL,
    baseUrl: overrides.baseUrl ?? env[`${envPrefix}_BASE_URL`] ?? env.AI_BASE_URL,
    headers: overrides.headers,
  };
}

export function createProviderFromEnv(
  overrides: Partial<ProviderConfig> = {},
  env: Record<string, string | undefined> = process.env,
): AiProvider {
  return createProvider(configFromEnv(env, overrides));
}
