import type { Page } from "@playwright/test";
import type { TestStep } from "@ai-tester/shared";

import { getLocator } from "./locator";
import { resolveValue } from "./variables";

export async function executeStep(page: Page, step: TestStep) {
  switch (step.action) {
    case "goto":
      await page.goto(resolveValue(step.value));
      break;

    case "fill":
      await getLocator(page, step.target).fill(resolveValue(step.value));
      break;

    case "click":
      await getLocator(page, step.target).click();
      break;

    case "expect-url":
      await page.waitForURL(resolveValue(step.value));
      break;

    default:
      throw new Error(`Unsupported action: ${(step as any).action}`);
  }
}
