import { createProviderFromEnv, type GenerateTestPlanInput } from "@ai-tester/ai";
import { exploreWebsite } from "@ai-tester/browser";
import type { CaseResult, TestPlan } from "@ai-tester/shared";
import { runTestPlan } from "@ai-tester/test-engine";

export interface GeneratePlanOptions {
  instructions?: string;
  providerId?: string;
  model?: string;
  /** Ignored unless the selected provider reports vision support. */
  screenshot?: boolean;
}

export interface GeneratePlanResult {
  plan: TestPlan;
  page: GenerateTestPlanInput["page"];
}

/** Explore a URL, then ask the configured provider for a test plan. */
export async function generatePlan(
  url: string,
  options: GeneratePlanOptions = {},
): Promise<GeneratePlanResult> {
  const provider = createProviderFromEnv({
    ...(options.providerId ? { id: options.providerId } : {}),
    ...(options.model ? { model: options.model } : {}),
  });

  const wantsScreenshot = Boolean(options.screenshot) && provider.capabilities.vision;
  const exploration = await exploreWebsite(url, { screenshot: wantsScreenshot });

  const plan = await provider.generateTestPlan({
    page: exploration.page,
    ...(exploration.screenshot ? { screenshot: exploration.screenshot } : {}),
    ...(options.instructions ? { instructions: options.instructions } : {}),
  });

  return { plan, page: exploration.page };
}

export async function generateAndRun(
  url: string,
  options: GeneratePlanOptions = {},
): Promise<{ plan: TestPlan; results: CaseResult[] }> {
  const { plan } = await generatePlan(url, options);

  const results = await runTestPlan(plan, {
    onEvent: (event) => {
      if (event.type === "case-start") {
        console.log(`\nRunning: ${event.title}`);
      }

      if (event.type === "case-end") {
        const { status, title, error } = event.result;
        console.log(`  ${status === "passed" ? "✓" : "✗"} ${title}`);

        if (error) {
          console.log(`    ${error}`);
        }
      }
    },
  });

  return { plan, results };
}
