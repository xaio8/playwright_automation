import { redis } from "./redis.js";
import type {
  Generation,
  Execution,
  PageContext,
  TestPlan,
  CaseResult,
} from "@ai-tester/shared";
import { redisKeys } from "@ai-tester/shared";

// ─── Generation Store ──────────────────────────────────────────

export const generationStore = {
  async create(
    data: Omit<Generation, "pageContext" | "plan" | "code" | "error">,
  ) {
    const key = redisKeys.generation(data.id);
    await redis.hset(key, {
      id: data.id,
      url: data.url,
      state: data.state,
      providerId: data.providerId,
      model: data.model,
      createdAt: data.createdAt,
      pageContext: "",
      plan: "",
      code: "",
      error: "",
    });
    // Add to list for tracking
    // await redis.lpush(redisKeys.allGenerations, data.id);
    return data;
  },

  async get(id: string): Promise<Generation | null> {
    const key = redisKeys.generation(id);
    const raw = await redis.hgetall(key);
    if (!raw.id) return null;
    return parseGeneration(raw);
  },

  async updateState(id: string, state: Generation["state"]) {
    await redis.hset(redisKeys.generation(id), "state", state);
  },

  async updatePageContext(id: string, ctx: PageContext) {
    await redis.hset(
      redisKeys.generation(id),
      "pageContext",
      JSON.stringify(ctx),
    );
  },

  async updatePlan(id: string, plan: TestPlan) {
    await redis.hset(redisKeys.generation(id), "plan", JSON.stringify(plan));
  },

  async updateCode(id: string, code: string) {
    await redis.hset(redisKeys.generation(id), "code", code);
  },

  async updateError(id: string, error: { kind: string; message: string }) {
    await redis.hset(
      redisKeys.generation(id),
      "error",
      JSON.stringify(error),
      "state",
      "failed",
    );
  },

  async setSuccess(id: string, plan: TestPlan, code: string) {
    await redis.hset(redisKeys.generation(id), {
      plan: JSON.stringify(plan),
      code,
      state: "succeeded",
    });
  },
};

// ─── Execution Store ───────────────────────────────────────────

export const executionStore = {
  async create(data: {
    id: string;
    generationId: string;
    state: Execution["state"];
  }) {
    const key = redisKeys.execution(data.id);
    await redis.hset(key, {
      id: data.id,
      generationId: data.generationId,
      state: data.state,
      results: "[]",
    });
    // await redis.lpush(redisKeys.allExecutions, data.id);
    return data;
  },

  async get(id: string): Promise<Execution | null> {
    const key = redisKeys.execution(id);
    const raw = await redis.hgetall(key);
    if (!raw.id) return null;
    return {
      id: raw.id,
      generationId: raw.generationId as string,
      state: raw.state as Execution["state"],
      results: JSON.parse(raw.results ?? "[]"),
    };
  },

  async updateState(id: string, state: Execution["state"]) {
    await redis.hset(redisKeys.execution(id), "state", state);
  },

  async updateResults(id: string, results: CaseResult[]) {
    await redis.hset(
      redisKeys.execution(id),
      "results",
      JSON.stringify(results),
    );
  },

  async setDone(id: string, results: CaseResult[], passed: boolean) {
    await redis.hset(redisKeys.execution(id), {
      results: JSON.stringify(results),
      state: passed ? "succeeded" : "failed",
    });
  },
};

// ─── Helper ────────────────────────────────────────────────────

function parseGeneration(raw: Record<string, string>): Generation {
  return {
    id: raw.id as string,
    url: raw.url as string,
    state: raw.state as Generation["state"],
    providerId: raw.providerId as string,
    model: raw.model as string,
    createdAt: raw.createdAt as string,
    pageContext: raw.pageContext ? JSON.parse(raw.pageContext) : null,
    plan: raw.plan ? JSON.parse(raw.plan) : null,
    code: raw.code || null,
    error: raw.error ? JSON.parse(raw.error) : null,
  };
}
