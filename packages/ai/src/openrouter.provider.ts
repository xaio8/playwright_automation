import OpenAI from "openai";
import { testPlanSchema, type TestPlan } from "@ai-tester/shared";

export class OpenRouterProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });
  }

  async generateTestPlan(pageData: unknown): Promise<TestPlan> {
    const response = await this.client.chat.completions.create({
      model: "poolside/laguna-s-2.1:free",
      messages: [
        {
          role: "system",
          content: `
You are an expert QA engineer. Analyze the page data and return a JSON object strictly matching this format:
{
  "feature": "Login Functionality",
  "testCases": [
    {
      "title": "Login with valid credentials",
      "category": "happy-path", // MUST be one of: "happy-path", "validation", "negative", "boundary"
      "description": "User enters valid email and password and redirects to dashboard",
      "steps": [
        {
          "action": "goto",
          "value": "http://localhost:5173/auth/login"
        },
        {
          "action": "fill",
          "target": { "strategy": "label", "value": "Email" },
          "value": "user@example.com"
        },
        {
          "action": "click",
          "target": { "strategy": "role", "value": "button[name='Login']" }
        }
      ]
    }
  ]
}

Valid actions: "goto", "click", "fill", "expect-visible", "expect-text", "expect-url".
Valid locator strategies: "role", "label", "text", "testid".
Do not output markdown block backticks. Output pure raw JSON only.
`,
        },
        {
          role: "user",
          content: JSON.stringify(pageData, null, 2),
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "";

    if (!content) {
      throw new Error("AI returned empty response");
    }

    const cleanedContent = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleanedContent);
    return testPlanSchema.parse(parsed);
  }
}
