import { createProviderFromEnv } from "@ai-tester/ai";
import { exploreWebsite } from "@ai-tester/browser";
import type {
  CaseResult,
  TestPlan,
  PageContext,
  ExecutionEvent,
} from "@ai-tester/shared";
import { runTestPlan } from "@ai-tester/test-engine";

export interface GeneratePlanOptions {
  instructions?: string;
  providerId?: string;
  model?: string;
  screenshot?: boolean;
}

export interface GeneratePlanResult {
  plan: TestPlan;
  pageContext: PageContext; // Renamed from "page" for consistency with your schemas
}

/**
 * STEP 1: Explore URL → Get page context → Ask AI for test plan
 * This is what the GENERATION queue job calls.
 */
export async function generatePlan(
  url: string,
  options: GeneratePlanOptions = {},
): Promise<GeneratePlanResult> {
  const provider = createProviderFromEnv({
    ...(options.providerId ? { id: options.providerId } : {}),
    ...(options.model ? { model: options.model } : {}),
  });

  const wantsScreenshot =
    Boolean(options.screenshot) && provider.capabilities.vision;
  const exploration = await exploreWebsite(url, {
    screenshot: wantsScreenshot,
  });

  const plan = await provider.generateTestPlan({
    page: exploration.page,
    ...(exploration.screenshot ? { screenshot: exploration.screenshot } : {}),
    ...(options.instructions ? { instructions: options.instructions } : {}),
  });

  return { plan, pageContext: exploration.page };
}

/**
 * STEP 2: Execute a test plan with Playwright
 * This is what the EXECUTION queue job calls.
 */
export async function executePlan(
  plan: TestPlan,
  onEvent: (event: ExecutionEvent) => void, // Type this properly from @ai-tester/test-engine
): Promise<CaseResult[]> {
  const results = await runTestPlan(plan, { onEvent });
  return results;
}

// Keep generateAndRun for CLI/local testing only
export async function generateAndRun(
  url: string,
  options: GeneratePlanOptions = {},
): Promise<{ plan: TestPlan; results: CaseResult[] }> {
  const { plan } = await generatePlan(url, options);

  const results = await executePlan(plan, (event) => {
    if (event.type === "case-start") {
      console.log(`\nRunning: ${event.title}`);
    }
    if (event.type === "case-end") {
      const { status, title, error } = event.result;
      console.log(`  ${status === "passed" ? "✓" : "✗"} ${title}`);
      if (error) console.log(`    ${error}`);
    }
  });

  return { plan, results };
}
