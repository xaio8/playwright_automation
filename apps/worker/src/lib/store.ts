import { redis } from "./redis.js";
import { redisKeys } from "@ai-tester/shared";
import type {
  Generation,
  PageContext,
  TestPlan,
  CaseResult,
  GenerationState,
  ExecutionState,
} from "@ai-tester/shared";

// ─── Generation Store ────────────────────────────────────────

export const generationStore = {
  /** Worker needs this to fetch the plan for execution */
  async get(id: string): Promise<Generation | null> {
    const raw = await redis.hgetall(redisKeys.generation(id));
    if (!raw.id) return null;

    return {
      id: raw.id,
      url: raw.url as string,
      state: raw.state as GenerationState,
      providerId: raw.providerId as string,
      model: raw.model as string,
      createdAt: raw.createdAt as string,
      pageContext: raw.pageContext ? JSON.parse(raw.pageContext) : null,
      plan: raw.plan ? JSON.parse(raw.plan) : null,
      code: raw.code || null,
      error: raw.error ? JSON.parse(raw.error) : null,
    };
  },

  updateState(id: string, state: GenerationState) {
    return redis.hset(redisKeys.generation(id), "state", state);
  },

  setSuccess(
    id: string,
    plan: TestPlan,
    code: string,
    pageContext: PageContext,
  ) {
    return redis.hset(redisKeys.generation(id), {
      pageContext: JSON.stringify(pageContext),
      plan: JSON.stringify(plan),
      code,
      state: "succeeded",
    });
  },

  setError(id: string, error: { kind: string; message: string }) {
    return redis.hset(
      redisKeys.generation(id),
      "error",
      JSON.stringify(error),
      "state",
      "failed",
    );
  },
};

// ─── Execution Store ─────────────────────────────────────────

export const executionStore = {
  updateState(id: string, state: ExecutionState) {
    return redis.hset(redisKeys.execution(id), "state", state);
  },

  setDone(id: string, results: CaseResult[], allPassed: boolean) {
    return redis.hset(redisKeys.execution(id), {
      results: JSON.stringify(results),
      state: allPassed ? "succeeded" : "failed",
    });
  },
};
