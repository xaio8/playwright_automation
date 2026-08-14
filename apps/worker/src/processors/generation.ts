import type { Job } from "bullmq";
import { redisPub } from "../lib/redis.js";
import { generationStore } from "../lib/store.js";
import { generatePlan } from "../pipeline.js";
import type { GenerationJobData, TestPlan } from "@ai-tester/shared";
import type { GenerationEvent } from "@ai-tester/shared";
import { redisKeys } from "@ai-tester/shared";

// Helper to emit events via Redis Pub/Sub
function emit(id: string, event: GenerationEvent) {
  redisPub.publish(redisKeys.generationEvents(id), JSON.stringify(event));
}

export async function processGeneration(job: Job<GenerationJobData>) {
  const { generationId, url, instructions, providerId, model } = job.data;

  try {
    // ─── State: Exploring ──────────────────────────────────
    await generationStore.updateState(generationId, "exploring");
    emit(generationId, { type: "state", state: "exploring" });
    emit(generationId, { type: "log", message: `Navigating to ${url}...` });

    // ─── Call Your Existing Pipeline ───────────────────────
    const { plan, pageContext } = await generatePlan(url, {
      instructions,
      providerId,
      model,
      screenshot: true, // Enable if you want
    });

    // ─── State: Validating ─────────────────────────────────
    await generationStore.updateState(generationId, "validating");
    emit(generationId, { type: "state", state: "validating" });

    // Generate Playwright code from plan (implement this)
    const code = generateCode(plan);

    // ─── Done ──────────────────────────────────────────────
    await generationStore.setSuccess(generationId, plan, code, pageContext);
    emit(generationId, { type: "done", ok: true });

    console.log(
      `✅ Generation ${generationId} completed: ${plan.testCases.length} cases`,
    );
  } catch (err) {
    const error = {
      kind: mapErrorKind(err),
      message: err instanceof Error ? err.message : String(err),
    };

    await generationStore.setError(generationId, error);
    emit(generationId, { type: "done", ok: false, error });

    console.error(`❌ Generation ${generationId} failed:`, error.message);
    throw err; // Let BullMQ mark job as failed
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function generateCode(plan: TestPlan): string {
  // TODO: Implement this properly
  // Convert your TestPlan to Playwright test code string
  return `
import { test, expect } from '@playwright/test';

test.describe('${plan.feature}', () => {
 ${plan.testCases
   .map(
     (tc) => `
  test('${tc.title}', async ({ page }) => {
 ${tc.steps
   .map((step) => {
     switch (step.action) {
       case "goto":
         return `    await page.goto('${step.url}');`;
       case "click":
         return `    await page.getByRole('${step.target.role}'${step.target.name ? `, { name: '${step.target.name}' }` : ""}).click();`;
       case "fill":
         return `    await page.getByRole('${step.target.role}'${step.target.name ? `, { name: '${step.target.name}' }` : ""}).fill('${step.value}');`;
       default:
         return `    // ${step.action} not implemented`;
     }
   })
   .join("\n")}
  });
`,
   )
   .join("\n")}
});
`;
}

function mapErrorKind(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("econnrefused") || msg.includes("net::err_connection"))
      return "unreachable_url";
    if (msg.includes("403") || msg.includes("forbidden")) return "blocked_url";
    if (msg.includes("timeout") || msg.includes("timed out")) return "timeout";
    if (msg.includes("json") || msg.includes("parse")) return "invalid_output";
  }
  return "provider_error";
}
