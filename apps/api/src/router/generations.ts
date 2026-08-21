import type { FastifyPluginAsync } from "fastify";
import { nanoid } from "nanoid";
import { createGenerationRequestSchema } from "@ai-tester/shared";
import { generationQueue } from "../lib/queues.js";
import { generationStore } from "../lib/store.js";
import { redisSub } from "../lib/redis.js";
import { redisKeys } from "@ai-tester/shared";

export const generationRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/generations - Create & enqueue
  // api/src/routes/generations.ts

  app.post("/generations", async (req, res) => {
    const request = createGenerationRequestSchema.parse(req.body);

    const id = nanoid();

    // Create in Redis
    await generationStore.create({
      id,
      url: request.url,
      state: "queued",
      // providerId: request.providerId ?? "openai",
      // model: request.model ?? "gpt-4o",
      providerId: null,
      model:null,
      createdAt: new Date().toISOString(),
    });

    // Enqueue with YOUR shared interface shape
    await generationQueue.add("generate", {
      generationId: id,
      request, // ← Pass the whole request object
    });

    return res.status(201).send({ id, state: "queued" });
  });

  // GET /api/generations/:id - Get current state
  app.get<{ Params: { id: string } }>("/generations/:id", async (req, res) => {
    const generation = await generationStore.get(req.params.id);
    if (!generation) {
      return res.status(404).send({ error: "Not found" });
    }
    return generation;
  });

  // GET /api/generations/:id/events - SSE stream
  app.get<{ Params: { id: string } }>(
    "/generations/:id/events",
    async (req, res) => {
      const { id } = req.params;

      // Set SSE headers
      res.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      // Send initial comment to keep connection alive
      res.raw.write(": connected\n\n");

      const channel = redisKeys.generationEvents(id);

      const handler = (message: string) => {
        res.raw.write(`data: ${message}\n\n`);
      };

      redisSub.subscribe(channel);
      redisSub.on("message", handler);

      // Clean up on disconnect
      req.raw.on("close", () => {
        redisSub.unsubscribe(channel);
        redisSub.off("message", handler);
      });
    },
  );
};
