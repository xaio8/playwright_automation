import Fastify from "fastify";
import path from "node:path";
import dotenv from "dotenv";
import { generationRoutes } from "./router/generations.js";
import { executionRoutes } from "./router/executions.js";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const app = Fastify({
  logger: true,
});

app.get("/", async () => {
  return {
    message: "AI Playwright Tester API",
  };
});

// async function start() {
try {
  await app.register(generationRoutes, { prefix: "/api" });
  await app.register(executionRoutes, { prefix: "/api" });
  await app.listen({
    port: 3000,
    host: "localhost",
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
// }

// start();
