import type {
  CreateExecutionRequest,
  CreateGenerationRequest,
} from "./api.schema.js";

export const QUEUE_NAMES = {
  GENERATION: "generation" as const,
  EXECUTION: "execution" as const,
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface GenerationJobData {
  generationId: string;
  request: CreateGenerationRequest;
}

export interface ExecutionJobData {
  executionId: string;
  request: CreateExecutionRequest;
}

// redis
export const redisKeys = {
  generation: (id: string) => `generation:${id}`,
  execution: (id: string) => `execution:${id}`,
  generationEvents: (id: string) => `generation:${id}:events`,
  executionEvents: (id: string) => `execution:${id}:events`,
  generationChannel: (id: string) => `generation:${id}:channel`,
  executionChannel: (id: string) => `execution:${id}:channel`,
} as const;
