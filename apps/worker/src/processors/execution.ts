import type { Job } from "bullmq";
import { redisPub } from "../lib/redis.js";
import { redisKeys } from "@ai-tester/shared";
import { executionStore, generationStore } from "../lib/store.js";
import { executePlan } from "../pipeline.js";
import type { ExecutionJobData } from "@ai-tester/shared";
import type { ExecutionEvent } from "@ai-tester/shared";
import type {  CaseResult } from "@ai-tester/shared";

function emit(id: string, event: ExecutionEvent) {
  redisPub.publish(redisKeys.executionEvents(id), JSON.stringify(event));
}

export async function processExecution(job: Job<ExecutionJobData>) {
  const { executionId, request } = job.data;
  const { generationId, caseTitles } = request;

  try {
    await executionStore.updateState(executionId, "running");

    // ─── Fetch Plan from Redis ─────────────────────────────
    const generation = await generationStore.get(generationId);

    if (!generation) {
      throw new Error(`Generation ${generationId} not found in Redis`);
    }

    if (!generation.plan) {
      throw new Error(`Generation ${generationId} has no test plan`);
    }

    const plan = generation.plan;

    // ─── Filter Cases if Requested ─────────────────────────
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

    // ─── Execute ───────────────────────────────────────────
    const results: CaseResult[] = await executePlan(casesToRun, (event) => {
      switch (event.type) {
        case "case-start":
          emit(executionId, { type: "case-start", title: event.title });
          break;

        case "step":
          emit(executionId, {
            type: "step",
            title: event.title,
            stepIndex: event.stepIndex,
            status: event.status,
            error: event.error,
          });
          break;

        case "case-end": {
          const { status } = event.result;
          if (status === "passed") passed++;
          else failed++;

          emit(executionId, { type: "case-end", result: event.result });
          break;
        }
      }
    });

    // ─── Done ──────────────────────────────────────────────
    await executionStore.setDone(executionId, results, failed === 0);
    emit(executionId, { type: "done", passed, failed });

    console.log(
      `✅ Execution ${executionId}: ${passed} passed, ${failed} failed`,
    );
  } catch (err) {
    await executionStore.updateState(executionId, "failed");

    // Emit error event so frontend knows
    emit(executionId, {
      type: "done",
      passed: 0,
      failed: 0,
    });

    console.error(`❌ Execution ${executionId} failed:`, err);
    throw err;
  }
}
