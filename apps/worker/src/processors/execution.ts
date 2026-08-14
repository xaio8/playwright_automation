// worker/src/processors/execution.ts

import type { Job } from "bullmq";
import { redisPub } from "../lib/redis.js";
import { executionStore } from "../lib/store.js";
import { executePlan } from "../pipeline.js";
import type { ExecutionJobData } from "@ai-tester/shared";
import type { ExecutionEvent } from "@ai-tester/shared";
import type { CaseResult } from "@ai-tester/shared";
import { redisKeys } from "@ai-tester/shared";

function emit(id: string, event: ExecutionEvent) {
  redisPub.publish(redisKeys.executionEvents(id), JSON.stringify(event));
}

export async function processExecution(job: Job<ExecutionJobData>) {
  const { executionId, generationId, caseTitles, plan } = job.data;

  try {
    await executionStore.updateState(executionId, "running");

    // Filter cases if specific ones requested
    const casesToRun = caseTitles
      ? {
          ...plan,
          testCases: plan.testCases.filter((tc) =>
            caseTitles.includes(tc.title),
          ),
        }
      : plan;

    let passed = 0;
    let failed = 0;

    //  Execute with Event Forwarding 
    const results: CaseResult[] = await executePlan(casesToRun, (event) => {
      // Forward events from runTestPlan directly to Redis
      // Your runTestPlan emits: case-start, step, case-end, done

      if (event.type === "case-start") {
        emit(executionId, { type: "case-start", title: event.title });
      }

      if (event.type === "step") {
        emit(executionId, {
          type: "step",
          title: event.title, // Make sure this matches your schema
          stepIndex: event.stepIndex,
          status: event.status,
          error: event.error,
        });
      }

      if (event.type === "case-end") {
        const result = event.result;
        if (result.status === "passed") passed++;
        else failed++;

        emit(executionId, { type: "case-end", result });
      }

      if (event.type === "done") {
        // We'll emit our own "done" after executePlan resolves
      }
    });

    //  Done 
    await executionStore.setDone(executionId, results, failed === 0);
    emit(executionId, { type: "done", passed, failed });

    console.log(
      `✅ Execution ${executionId} completed: ${passed} passed, ${failed} failed`,
    );
  } catch (err) {
    await executionStore.updateState(executionId, "failed");
    console.error(`❌ Execution ${executionId} failed:`, err);
    throw err;
  }
}
