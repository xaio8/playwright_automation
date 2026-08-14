import { FastifyPluginAsync } from "fastify";
import { nanoid } from "nanoid";
import { createExecutionRequestSchema } from "@ai-tester/shared";
import { executionQueue } from "../lib/queues.js";
import { executionStore, generationStore } from "../lib/store.js";
import { redisSub } from "../lib/redis.js";
import { redisKeys } from "@ai-tester/shared";

export const executionRoutes: FastifyPluginAsync = async (app) => {
  
  // POST /api/executions - Create & enqueue
  app.post("/executions", async (req, res) => {
    const body = createExecutionRequestSchema.parse(req.body);
    
    // Get the generation (need the plan!)
    const generation = await generationStore.get(body.generationId);
    if (!generation || !generation.plan) {
      return res.status(400).send({ error: "Generation not found or has no plan" });
    }
    
    const id = nanoid();
    const execution = await executionStore.create({
      id,
      generationId: body.generationId,
      state: "queued",
    });
    
    await executionQueue.add("execute", {
      executionId: id,
      generationId: body.generationId,
      caseTitles: body.caseTitles,
      plan: generation.plan,  // Pass plan to worker
    });
    
    return res.status(201).send(execution);
  });

  // GET /api/executions/:id
  app.get("/executions/:id", async (req, res) => {
    const execution = await executionStore.get(req.params.id);
    if (!execution) {
      return res.status(404).send({ error: "Not found" });
    }
    return execution;
  });

  // GET /api/executions/:id/events - SSE stream
  app.get("/executions/:id/events", async (req, res) => {
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
  });
};