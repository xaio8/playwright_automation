import { Worker } from "bullmq";
import { redis } from "./redis.js";
import {
  QUEUE_NAMES,
  type ExecutionJobData,
  type GenerationJobData,
} from "@ai-tester/shared";

export const generationWorker = new Worker<GenerationJobData>(
  QUEUE_NAMES.GENERATION,
  undefined, // Handler set separately
  { connection: redis, concurrency: 1 },
);

export const executionWorker = new Worker<ExecutionJobData>(
  QUEUE_NAMES.EXECUTION,
  undefined,
  { connection: redis, concurrency: 1 },
);
