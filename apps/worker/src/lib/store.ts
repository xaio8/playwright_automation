import {
  redisKeys,
  type CaseResult,
  type ExecutionState,
  type GenerationState,
  type PageContext,
  type TestPlan,
} from "@ai-tester/shared";
import { redis } from "./redis.js";

//  Generation Updates

export const generationStore = {
  updateState(id: string, state: GenerationState) {
    return redis.hset(redisKeys.generation(id), "state", state);
  },

  updatePageContext(id: string, ctx: PageContext) {
    return redis.hset(
      redisKeys.generation(id),
      "pageContext",
      JSON.stringify(ctx),
    );
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

//  Execution Updates

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
