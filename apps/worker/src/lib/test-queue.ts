// import { Worker } from "bullmq";
// import { redis } from "./redis.js";

// // DUMMY HANDLERS - Disconnecting your real code to see if BullMQ connects
// async function dummyGeneration(job: any) {
//   console.log(`🔥 Dummy Generation got job: ${job.id}`);
// }

// async function dummyExecution(job: any) {
//   console.log(`🔥 Dummy Execution got job: ${job.id}`);
// }

// export const generationWorker = new Worker("generation", dummyGeneration, {
//   connection: redis,
//   concurrency: 1,
// });

// export const executionWorker = new Worker("execution", dummyExecution, {
//   connection: redis,
//   concurrency: 1,
// });

// console.log("✅ Queues file loaded successfully");
