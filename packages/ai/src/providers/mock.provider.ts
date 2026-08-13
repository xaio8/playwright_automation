import type { TestPlan } from "@ai-tester/shared";
import type {
  AiProvider,
  GenerateTestPlanInput,
  ProviderCapabilities,
} from "../provider.js";

export const MOCK_ID = "mock";

/** Deterministic provider so the UI, engine and CI work without an API key. */
export class MockProvider implements AiProvider {
  readonly id = MOCK_ID;
  readonly defaultModel = "mock-1";
  readonly capabilities: ProviderCapabilities = {
    vision: true,
    jsonSchema: true,
  };

  async generateTestPlan(input: GenerateTestPlanInput): Promise<TestPlan> {
    const { page } = input;
    const firstInput = page.inputs[0];
    const firstButton = page.buttons[0];

    return {
      feature: page.title || page.url,
      testCases: [
        {
          title: "Page loads and shows its main content",
          category: "happy-path",
          description: `Opens ${page.url} and checks the page renders.`,
          steps: [
            { action: "goto", url: page.url },
            { action: "expect-url", value: page.url },
            ...(page.headings[0]
              ? ([
                  {
                    action: "expect-visible" as const,
                    target: {
                      strategy: "text" as const,
                      value: page.headings[0].text,
                    },
                  },
                ] as const)
              : []),
          ],
        },
        ...(firstInput && firstButton
          ? [
              {
                title: `Submitting the form via "${firstButton.text}"`,
                category: "happy-path" as const,
                description: "Fills the first input and submits the form.",
                steps: [
                  { action: "goto" as const, url: page.url },
                  {
                    action: "fill" as const,
                    target: {
                      strategy: "label" as const,
                      value:
                        firstInput.label ??
                        firstInput.ariaLabel ??
                        firstInput.name ??
                        "input",
                    },
                    value: "mock value",
                  },
                  {
                    action: "click" as const,
                    target: {
                      strategy: "role" as const,
                      role: "button" as const,
                      name: firstButton.text,
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    };
  }
}
