import { z } from "zod";
import {
  caseResultSchema,
  generationErrorKindSchema,
  generationStateSchema,
} from "./api.schema.js";

/** Server-sent events for `GET /api/generations/:id/events`. */
export const generationEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("state"),
    state: generationStateSchema,
  }),
  z.object({ type: z.literal("log"), message: z.string() }),
  z.object({
    type: z.literal("done"),
    ok: z.boolean(),
    error: z
      .object({ kind: generationErrorKindSchema, message: z.string() })
      .optional(),
  }),
]);

/** Server-sent events for `GET /api/executions/:id/events`. */
export const executionEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("case-start"), title: z.string() }),
  z.object({
    type: z.literal("step"),
    title: z.string(),
    stepIndex: z.number().int(),
    status: z.enum(["running", "passed", "failed"]),
    error: z.string().optional(),
  }),
  z.object({ type: z.literal("case-end"), result: caseResultSchema }),
  z.object({ type: z.literal("done"), passed: z.number(), failed: z.number() }),
]);

export type GenerationEvent = z.infer<typeof generationEventSchema>;
export type ExecutionEvent = z.infer<typeof executionEventSchema>;
