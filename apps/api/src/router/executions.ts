import type { FastifyPluginAsync } from "fastify";
import { nanoid } from "nanoid";
import { createExecutionRequestSchema } from "@ai-tester/shared";
import { executionQueue } from "../lib/queues.js";
import { executionStore, generationStore } from "../lib/store.js";
import { redisSub } from "../lib/redis.js";
import { redisKeys } from "@ai-tester/shared";

export const executionRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/executions - Create & enqueue
  // api/src/routes/executions.ts

  app.post("/executions", async (req, res) => {
    const request = createExecutionRequestSchema.parse(req.body);

    // Verify generation exists and has plan
    const generation = await generationStore.get(request.generationId);
    if (!generation || !generation.plan) {
      return res
        .status(400)
        .send({ error: "Generation not found or has no plan" });
    }

    const id = nanoid();

    // Create in Redis
    await executionStore.create({
      id,
      generationId: request.generationId,
      state: "queued",
    });

    // Enqueue with YOUR shared interface shape
    await executionQueue.add("execute", {
      executionId: id,
      request, // ← Pass the whole request object (contains generationId + caseTitles)
    });

    return res.status(201).send({ id, state: "queued" });
  });

  // GET /api/executions/:id
  app.get<{ Params: { id: string } }>("/executions/:id", async (req, res) => {
    const execution = await executionStore.get(req.params.id);
    if (!execution) {
      return res.status(404).send({ error: "Not found" });
    }
    return execution;
  });

  // GET /api/executions/:id/events - SSE stream
  app.get<{ Params: { id: string } }>(
    "/executions/:id/events",
    async (req, res) => {
      const { id } = req.params;

      res.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      res.raw.write(": connected\n\n");

      const channel = redisKeys.executionEvents(id);

      const handler = (ch: string, message: string) => {
        if (ch === channel) {
          res.raw.write(`data: ${message}\n\n`);
        }
      };

      redisSub.subscribe(channel);
      redisSub.on("message", handler);

      req.raw.on("close", () => {
        redisSub.unsubscribe(channel);
        redisSub.off("message", handler);
      });
    },
  );
};
