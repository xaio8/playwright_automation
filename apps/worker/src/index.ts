import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

import { generationWorker, executionWorker } from "./lib/queues.js";
// import { processGeneration } from "./processors/generation.js";
// import { processExecution } from "./processors/execution.js";

//  Register Handlers 

// generationWorker.on("process", processGeneration);
// executionWorker.on("process", processExecution);

//  Logging 

generationWorker.on("completed", (job) => {
  console.log(`✅ Generation job ${job.id} completed`);
});

generationWorker.on("failed", (job, err) => {
  console.error(`❌ Generation job ${job?.id} failed:`, err.message);
});

executionWorker.on("completed", (job) => {
  console.log(`✅ Execution job ${job.id} completed`);
});

executionWorker.on("failed", (job, err) => {
  console.error(`❌ Execution job ${job?.id} failed:`, err.message);
});

//  Start 

console.log("🚀 Worker started, waiting for jobs...");
console.log(`   Generation queue: listening`);
console.log(`   Execution queue: listening`);

//  Graceful Shutdown 

async function shutdown() {
  console.log("\n🛑 Shutting down...");
  await generationWorker.close();
  await executionWorker.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
