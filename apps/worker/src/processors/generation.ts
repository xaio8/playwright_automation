import type { Job } from "bullmq";
import { redisPub } from "../lib/redis.js";
import { redisKeys } from "@ai-tester/shared";
import { generationStore } from "../lib/store.js";
import { generatePlan } from "../pipeline.js";
import type { GenerationErrorKind, GenerationJobData } from "@ai-tester/shared";
import type { GenerationEvent } from "@ai-tester/shared";
import type { TestPlan } from "@ai-tester/shared";

function emit(id: string, event: GenerationEvent) {
  redisPub.publish(redisKeys.generationEvents(id), JSON.stringify(event));
}

export async function processGeneration(job: Job<GenerationJobData>) {
  const { generationId, request } = job.data;
  const { url, instructions, providerId, model } = request;

  try {
    // ─── State: Exploring ──────────────────────────────────
    await generationStore.updateState(generationId, "exploring");
    emit(generationId, { type: "state", state: "exploring" });
    emit(generationId, { type: "log", message: `Navigating to ${url}...` });

    // ─── Call Pipeline ─────────────────────────────────────
    const { plan, pageContext } = await generatePlan(url, {
      instructions,
      providerId,
      model,
      screenshot: true,
    });

    // ─── State: Validating ─────────────────────────────────
    await generationStore.updateState(generationId, "validating");
    emit(generationId, { type: "state", state: "validating" });

    // Generate code
    const code = generateCode(plan);

    // ─── Done ──────────────────────────────────────────────
    await generationStore.setSuccess(generationId, plan, code, pageContext);
    emit(generationId, { type: "done", ok: true });

    console.log(
      `✅ Generation ${generationId}: ${plan.testCases.length} cases`,
    );
  } catch (err) {
    const error = {
      kind: mapErrorKind(err),
      message: err instanceof Error ? err.message : String(err),
    };

    await generationStore.setError(generationId, error);
    emit(generationId, { type: "done", ok: false, error });

    console.error(`❌ Generation ${generationId} failed:`, error.message);
    throw err;
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function generateCode(plan: TestPlan): string {
  // Your code generation logic
  return `// Generated for: ${plan.feature}`;
}

function mapErrorKind(err: unknown): GenerationErrorKind {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("econnrefused") || msg.includes("err_connection"))
      return "unreachable_url";
    if (msg.includes("403") || msg.includes("forbidden")) return "blocked_url";
    if (msg.includes("timeout")) return "timeout";
    if (msg.includes("json") || msg.includes("parse")) return "invalid_output";
  }
  return "provider_error";
}
