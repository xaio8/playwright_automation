import { describe, expect, it } from "vitest";
import {
  MockProvider,
  configFromEnv,
  createProvider,
  listProviderIds,
  registerProvider,
} from "./index.js";

describe("provider registry", () => {
  it("registers the built-in providers", () => {
    expect(listProviderIds()).toEqual(
      expect.arrayContaining(["openrouter", "openai", "ollama", "mock"]),
    );
  });

  it("creates a registered provider and rejects unknown ids", () => {
    expect(createProvider({ id: "mock" })).toBeInstanceOf(MockProvider);
    expect(() => createProvider({ id: "nope" })).toThrowError(/Unknown AI provider/);
  });

  it("lets a new provider be added without touching the registry", () => {
    registerProvider("custom", () => new MockProvider());

    expect(createProvider({ id: "custom" })).toBeInstanceOf(MockProvider);
  });

  it("derives the api key env var from the provider id", () => {
    expect(
      configFromEnv({ AI_PROVIDER: "openrouter", OPENROUTER_API_KEY: "k1" }),
    ).toMatchObject({ id: "openrouter", apiKey: "k1" });

    expect(
      configFromEnv({ AI_PROVIDER: "my-gateway", MY_GATEWAY_API_KEY: "k2" }),
    ).toMatchObject({ id: "my-gateway", apiKey: "k2" });
  });

  it("prefers explicit overrides over the environment", () => {
    const config = configFromEnv(
      { AI_PROVIDER: "openrouter", AI_MODEL: "from-env" },
      { id: "openai", model: "from-request" },
    );

    expect(config).toMatchObject({ id: "openai", model: "from-request" });
  });
});
