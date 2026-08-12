import { chromium } from "@playwright/test";

import type { TestPlan } from "@ai-tester/shared";
import { executeStep } from "./executor/execute.step.js";

export async function runTestPlan(testPlan: TestPlan) {
  const browser = await chromium.launch({
    headless: false,
  });

  const results = [];

  try {
    for (const testCase of testPlan.testCases) {
      console.log(`\nRunning: ${testCase.title}`);

      const page = await browser.newPage();

      try {
        for (const step of testCase.steps) {
          console.log(`  → ${step.action}`);

          await executeStep(page, step);
        }

        results.push({
          title: testCase.title,
          category: testCase.category,
          status: "passed",
        });

        console.log(`  ✓ PASSED`);
      } catch (error) {
        results.push({
          title: testCase.title,
          category: testCase.category,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });

        console.log(`  ✗ FAILED`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}
