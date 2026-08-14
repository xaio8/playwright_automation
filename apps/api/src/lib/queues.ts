import { Queue } from "bullmq";
import { redis } from "./redis.js";
import { QUEUE_NAMES, type ExecutionJobData, type GenerationJobData } from "@ai-tester/shared";

export const generationQueue = new Queue<GenerationJobData>(
  QUEUE_NAMES.GENERATION,
  { connection: redis }
);

export const executionQueue = new Queue<ExecutionJobData>(
  QUEUE_NAMES.EXECUTION,
  { connection: redis }
);