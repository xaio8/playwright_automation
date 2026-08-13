import { describe, expect, it } from "vitest";
import { testPlanSchema, testStepSchema } from "./test-plan.schema.js";

describe("testStepSchema", () => {
  it("requires the fields belonging to the action", () => {
    expect(
      testStepSchema.safeParse({ action: "fill", value: "hello" }).success,
    ).toBe(false);

    expect(
      testStepSchema.safeParse({
        action: "fill",
        target: { strategy: "label", value: "Email" },
        value: "hello",
      }).success,
    ).toBe(true);
  });

  it("accepts role locators with an accessible name", () => {
    const parsed = testStepSchema.parse({
      action: "click",
      target: { strategy: "role", role: "button", name: "Login" },
    });

    expect(parsed).toMatchObject({ target: { role: "button", name: "Login" } });
  });

  it("rejects unknown actions and strategies", () => {
    expect(testStepSchema.safeParse({ action: "hover" }).success).toBe(false);
    expect(
      testStepSchema.safeParse({
        action: "click",
        target: { strategy: "xpath", value: "//button" },
      }).success,
    ).toBe(false);
  });
});

describe("testPlanSchema", () => {
  it("requires at least one case with at least one step", () => {
    expect(
      testPlanSchema.safeParse({ feature: "Login", testCases: [] }).success,
    ).toBe(false);

    expect(
      testPlanSchema.safeParse({
        feature: "Login",
        testCases: [
          {
            title: "Loads",
            category: "happy-path",
            description: "Opens the page",
            steps: [{ action: "goto", url: "https://example.com" }],
          },
        ],
      }).success,
    ).toBe(true);
  });
});
