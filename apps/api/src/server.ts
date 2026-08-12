import Fastify from "fastify";

const app = Fastify({
  logger: true,
});

app.get("/", async () => {
  return {
    message: "AI Playwright Tester API",
  };
});

async function start() {
  try {
    await app.listen({
      port: 3000,
      host: "localhost",
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
