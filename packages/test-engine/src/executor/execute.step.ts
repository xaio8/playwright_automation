import { expect, type Page } from "@playwright/test";
import type { TestStep } from "@ai-tester/shared";
import { assertSafeUrl } from "@ai-tester/browser";

import { getLocator } from "./locator.js";
import { resolveValue } from "./variables.js";

export interface ExecuteStepOptions {
  timeoutMs?: number;
}

export async function executeStep(
  page: Page,
  step: TestStep,
  options: ExecuteStepOptions = {},
): Promise<void> {
  const timeout = options.timeoutMs;
  const timeoutOption = timeout === undefined ? {} : { timeout };

  switch (step.action) {
    case "goto": {
      // Step URLs are model-authored, so they get the same SSRF guard as the
      // URL the user submitted.
      const url = await assertSafeUrl(resolveValue(step.url));

      await page.goto(url.href, timeoutOption);
      return;
    }

    case "click":
      await getLocator(page, step.target).click(timeoutOption);
      return;

    case "fill":
      await getLocator(page, step.target).fill(
        resolveValue(step.value),
        timeoutOption,
      );
      return;

    case "press":
      await getLocator(page, step.target).press(step.key, timeoutOption);
      return;

    case "expect-visible":
      await expect(getLocator(page, step.target)).toBeVisible(timeoutOption);
      return;

    case "expect-text":
      await expect(getLocator(page, step.target)).toHaveText(
        resolveValue(step.value),
        timeoutOption,
      );
      return;

    case "expect-url":
      await page.waitForURL(resolveValue(step.value), timeoutOption);
      return;
  }
}
