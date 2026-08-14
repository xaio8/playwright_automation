import { FastifyPluginAsync } from "fastify";
import { nanoid } from "nanoid";
import { createGenerationRequestSchema } from "@ai-tester/shared";
import { generationQueue } from "../lib/queues.js";
import { generationStore } from "../lib/store.js";
import { redisSub } from "../lib/redis.js";
import { redisKeys } from "@ai-tester/shared";

export const generationRoutes: FastifyPluginAsync = async (app) => {
  
  // POST /api/generations - Create & enqueue
  app.post("/generations", async (req, res) => {
    const body = createGenerationRequestSchema.parse(req.body);
    
    const id = nanoid();
    const generation = await generationStore.create({
      id,
      url: body.url,
      state: "queued",
      providerId: body.providerId ?? "openai",
      model: body.model ?? "gpt-4o",
      createdAt: new Date().toISOString(),
    });
    
    // Enqueue job
    await generationQueue.add("generate", {
      generationId: id,
      url: body.url,
      instructions: body.instructions,
      providerId: generation.providerId,
      model: generation.model,
    });
    
    return res.status(201).send(generation);
  });

  // GET /api/generations/:id - Get current state
  app.get("/generations/:id", async (req, res) => {
    const generation = await generationStore.get(req.params.id);
    if (!generation) {
      return res.status(404).send({ error: "Not found" });
    }
    return generation;
  });

  // GET /api/generations/:id/events - SSE stream
  app.get("/generations/:id/events", async (req, res) => {
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
  });
};