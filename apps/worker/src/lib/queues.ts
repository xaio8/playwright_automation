import { Worker } from "bullmq";
import { redis } from "./redis.js";
import {
  QUEUE_NAMES,
  type ExecutionJobData,
  type GenerationJobData,
} from "@ai-tester/shared";
import { processGeneration } from "../processors/generation.js";
import { processExecution } from "../processors/execution.js";

async function dummyGeneration(job: any) {
  console.log(`🔥 Dummy got job: ${job.id}`);
}

async function dummyExecution(job: any) {
  console.log(`🔥 Dummy got job: ${job.id}`);
}

export const generationWorker = new Worker<GenerationJobData>(
  QUEUE_NAMES.GENERATION,
  processGeneration,
  { connection: redis, concurrency: 1 },
);

export const executionWorker = new Worker<ExecutionJobData>(
  QUEUE_NAMES.EXECUTION,
  processExecution,
  { connection: redis, concurrency: 1 },
);

console.log("✅ Queues file loaded successfully");
