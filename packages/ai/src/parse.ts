import { testPlanSchema, type TestPlan } from "@ai-tester/shared";
import { z } from "zod";
import { AiError } from "./provider.js";

/** Drops markdown fences and any prose surrounding the JSON object. */
export function extractJson(content: string): string {
  const withoutFences = content
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    return withoutFences;
  }

  return withoutFences.slice(start, end + 1);
}

export function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `- ${issue.path.join(".") || "<root>"}: ${issue.message}`)
    .join("\n");
}

/** Parses a model answer into a `TestPlan`, or throws `AiError`. */
export function parseTestPlan(content: string): TestPlan {
  if (!content.trim()) {
    throw new AiError("invalid_output", "Model returned an empty response");
  }

  let json: unknown;

  try {
    json = JSON.parse(extractJson(content));
  } catch (error) {
    throw new AiError("invalid_output", "Model output was not valid JSON", {
      cause: error,
    });
  }

  const result = testPlanSchema.safeParse(json);

  if (!result.success) {
    throw new AiError(
      "invalid_output",
      `Model output did not match the test plan schema:\n${formatIssues(result.error)}`,
    );
  }

  return result.data;
}
