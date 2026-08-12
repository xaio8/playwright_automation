import { z } from "zod";
import { pageContextSchema } from "./page-context.schema.js";
import { testPlanSchema } from "./test-plan.schema.js";

export const generationStateSchema = z.enum([
  "queued",
  "exploring",
  "generating",
  "validating",
  "succeeded",
  "failed",
]);

export const generationErrorKindSchema = z.enum([
  "unreachable_url",
  "blocked_url",
  "provider_error",
  "invalid_output",
  "timeout",
]);

export const createGenerationRequestSchema = z.object({
  url: z.string().url(),
  instructions: z.string().max(2000).optional(),
  providerId: z.string().optional(),
  model: z.string().optional(),
});

export const generationSchema = z.object({
  id: z.string(),
  url: z.string(),
  state: generationStateSchema,
  providerId: z.string(),
  model: z.string(),
  createdAt: z.string(),
  pageContext: pageContextSchema.nullable(),
  plan: testPlanSchema.nullable(),
  /** Playwright spec source generated from `plan`, for the user to copy. */
  code: z.string().nullable(),
  error: z
    .object({ kind: generationErrorKindSchema, message: z.string() })
    .nullable(),
});

export const executionStateSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
]);

export const createExecutionRequestSchema = z.object({
  generationId: z.string(),
  /** Titles of the cases to run; all cases when omitted. */
  caseTitles: z.array(z.string()).optional(),
});

export const caseResultSchema = z.object({
  title: z.string(),
  status: z.enum(["passed", "failed", "skipped"]),
  durationMs: z.number(),
  failedStepIndex: z.number().int().nullable(),
  error: z.string().nullable(),
});

export const executionSchema = z.object({
  id: z.string(),
  generationId: z.string(),
  state: executionStateSchema,
  results: z.array(caseResultSchema),
});

export const providerInfoSchema = z.object({
  id: z.string(),
  defaultModel: z.string(),
  capabilities: z.object({ vision: z.boolean(), jsonSchema: z.boolean() }),
  configured: z.boolean(),
});

export type GenerationState = z.infer<typeof generationStateSchema>;
export type GenerationErrorKind = z.infer<typeof generationErrorKindSchema>;
export type CreateGenerationRequest = z.infer<
  typeof createGenerationRequestSchema
>;
export type Generation = z.infer<typeof generationSchema>;
export type ExecutionState = z.infer<typeof executionStateSchema>;
export type CreateExecutionRequest = z.infer<
  typeof createExecutionRequestSchema
>;
export type CaseResult = z.infer<typeof caseResultSchema>;
export type Execution = z.infer<typeof executionSchema>;
export type ProviderInfo = z.infer<typeof providerInfoSchema>;
