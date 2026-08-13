import { chromium } from "@playwright/test";

import type { CaseResult, ExecutionEvent, TestPlan } from "@ai-tester/shared";
import { executeStep } from "./executor/execute.step.js";

export interface RunTestPlanOptions {
  headless?: boolean;
  /** Per-step timeout handed to Playwright. */
  stepTimeoutMs?: number;
  /** Run only these case titles; all cases when omitted. */
  caseTitles?: string[];
  /** Receives the same events the API streams to the browser. */
  onEvent?: (event: ExecutionEvent) => void;
}

export async function runTestPlan(
  testPlan: TestPlan,
  options: RunTestPlanOptions = {},
): Promise<CaseResult[]> {
  const {
    headless = true,
    stepTimeoutMs = 15_000,
    caseTitles,
    onEvent = () => {},
  } = options;

  const cases = caseTitles
    ? testPlan.testCases.filter((testCase) => caseTitles.includes(testCase.title))
    : testPlan.testCases;

  const browser = await chromium.launch({ headless });
  const results: CaseResult[] = [];

  try {
    for (const testCase of cases) {
      onEvent({ type: "case-start", title: testCase.title });

      const startedAt = Date.now();
      const context = await browser.newContext();
      const page = await context.newPage();
      let stepIndex = 0;

      try {
        for (const [index, step] of testCase.steps.entries()) {
          stepIndex = index;
          onEvent({
            type: "step",
            title: testCase.title,
            stepIndex: index,
            status: "running",
          });

          await executeStep(page, step, { timeoutMs: stepTimeoutMs });

          onEvent({
            type: "step",
            title: testCase.title,
            stepIndex: index,
            status: "passed",
          });
        }

        results.push({
          title: testCase.title,
          status: "passed",
          durationMs: Date.now() - startedAt,
          failedStepIndex: null,
          error: null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        onEvent({
          type: "step",
          title: testCase.title,
          stepIndex,
          status: "failed",
          error: message,
        });

        results.push({
          title: testCase.title,
          status: "failed",
          durationMs: Date.now() - startedAt,
          failedStepIndex: stepIndex,
          error: message,
        });
      } finally {
        await context.close();
      }

      const result = results[results.length - 1];

      if (result) {
        onEvent({ type: "case-end", result });
      }
    }
  } finally {
    await browser.close();
  }

  onEvent({
    type: "done",
    passed: results.filter((result) => result.status === "passed").length,
    failed: results.filter((result) => result.status === "failed").length,
  });

  return results;
}
