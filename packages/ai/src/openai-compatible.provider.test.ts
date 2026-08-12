import type { PageContext } from "@ai-tester/shared";
import { describe, expect, it } from "vitest";
import type { ChatClient, ChatRequest } from "./chat-client.js";
import { OpenAiCompatibleProvider } from "./openai-compatible.provider.js";
import { AiError } from "./provider.js";

const page: PageContext = {
  url: "https://example.com/login",
  title: "Login",
  headings: [{ level: 1, text: "Sign in" }],
  buttons: [
    { text: "Login", ariaLabel: null, testId: null, disabled: false },
  ],
  inputs: [
    {
      type: "email",
      name: "email",
      label: "Email",
      placeholder: null,
      ariaLabel: null,
      testId: null,
      required: true,
    },
  ],
  links: [],
  forms: [],
  truncated: false,
};

const validPlan = {
  feature: "Login",
  testCases: [
    {
      title: "Logs in",
      category: "happy-path",
      description: "Fills the form",
      steps: [
        { action: "goto", url: "https://example.com/login" },
        {
          action: "click",
          target: { strategy: "role", role: "button", name: "Login" },
        },
      ],
    },
  ],
};

class StubClient implements ChatClient {
  readonly requests: ChatRequest[] = [];
  private readonly responses: string[];

  constructor(responses: string[]) {
    this.responses = responses;
  }

  async complete(request: ChatRequest): Promise<string> {
    this.requests.push(request);

    return this.responses[this.requests.length - 1] ?? "";
  }
}

function createProvider(client: ChatClient, vision = true) {
  return new OpenAiCompatibleProvider({
    id: "stub",
    defaultModel: "stub-model",
    capabilities: { vision, jsonSchema: true },
    config: { id: "stub", apiKey: "test" },
    client,
  });
}

describe("OpenAiCompatibleProvider", () => {
  it("parses a plan wrapped in markdown fences", async () => {
    const client = new StubClient([
      "```json\n" + JSON.stringify(validPlan) + "\n```",
    ]);

    const plan = await createProvider(client).generateTestPlan({ page });

    expect(plan.feature).toBe("Login");
    expect(client.requests).toHaveLength(1);
    expect(client.requests[0]?.jsonSchema?.name).toBe("test_plan");
  });

  it("retries once with the validation errors when output is invalid", async () => {
    const client = new StubClient([
      JSON.stringify({ feature: "Login", testCases: [{ title: "x" }] }),
      JSON.stringify(validPlan),
    ]);

    const plan = await createProvider(client).generateTestPlan({ page });

    expect(plan.testCases).toHaveLength(1);
    expect(client.requests).toHaveLength(2);
    expect(JSON.stringify(client.requests[1]?.messages)).toContain(
      "did not match the JSON Schema",
    );
  });

  it("fails with invalid_output when the repair attempt also fails", async () => {
    const client = new StubClient(["not json", "still not json"]);

    await expect(
      createProvider(client).generateTestPlan({ page }),
    ).rejects.toMatchObject({ kind: "invalid_output" });
    expect(client.requests).toHaveLength(2);
  });

  it("attaches the screenshot only for vision-capable providers", async () => {
    const screenshot = { mimeType: "image/png", base64: "AAAA" };

    const withVision = new StubClient([JSON.stringify(validPlan)]);
    await createProvider(withVision, true).generateTestPlan({
      page,
      screenshot,
    });
    expect(withVision.requests[0]?.messages[1]?.content).toEqual([
      expect.objectContaining({ type: "text" }),
      expect.objectContaining({ type: "image_url" }),
    ]);

    const withoutVision = new StubClient([JSON.stringify(validPlan)]);
    await createProvider(withoutVision, false).generateTestPlan({
      page,
      screenshot,
    });
    expect(typeof withoutVision.requests[0]?.messages[1]?.content).toBe(
      "string",
    );
  });

  it("propagates provider errors without retrying", async () => {
    const failing: ChatClient = {
      complete: async () => {
        throw new AiError("provider_error", "429 rate limited");
      },
    };

    await expect(
      createProvider(failing).generateTestPlan({ page }),
    ).rejects.toMatchObject({ kind: "provider_error" });
  });
});
