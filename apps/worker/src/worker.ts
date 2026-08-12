import "dotenv/config";
import { generateAndRun } from "./pipeline.js";

/**
 * Temporary CLI entrypoint: `pnpm dev:worker <url>`. Replaced by BullMQ workers
 * once the API queues generation and execution jobs.
 */
async function main(): Promise<void> {
  const url = process.argv[2] ?? "https://example.com";
  const { plan, results } = await generateAndRun(url, { screenshot: true });

  console.log(`\nFeature: ${plan.feature}`);
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
