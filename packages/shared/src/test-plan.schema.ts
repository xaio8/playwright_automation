import { z } from "zod";

export const locatorSchema = z.object({
  strategy: z.enum(["role", "label", "text", "testid"]),
  value: z.string(),
});

export const testStepSchema = z.object({
  action: z.enum([
    "goto",
    "click",
    "fill",
    "expect-visible",
    "expect-text",
    "expect-url",
  ]),
  target: locatorSchema.optional(),
  value: z.string().optional(),
});

export const testCaseSchema = z.object({
  title: z.string(),
  category: z.enum(["happy-path", "validation", "negative", "boundary"]),
  description: z.string(),
  steps: z.array(testStepSchema),
});

export const testPlanSchema = z.object({
  feature: z.string(),
  testCases: z.array(testCaseSchema),
});

export type TestPlan = z.infer<typeof testPlanSchema>;
export type TestCase = z.infer<typeof testCaseSchema>;
export type TestStep = z.infer<typeof testStepSchema>;
