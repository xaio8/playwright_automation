import type { Locator as PlaywrightLocator, Page } from "@playwright/test";
import type { Locator } from "@ai-tester/shared";

export function getLocator(page: Page, target: Locator): PlaywrightLocator {
  switch (target.strategy) {
    case "role":
      return page.getByRole(target.role, {
        ...(target.name === undefined ? {} : { name: target.name }),
        ...(target.exact === undefined ? {} : { exact: target.exact }),
      });

    case "label":
      return page.getByLabel(target.value);

    case "text":
      return page.getByText(target.value);

    case "placeholder":
      return page.getByPlaceholder(target.value);

    case "testid":
      return page.getByTestId(target.value);

    case "css":
      return page.locator(target.value);
  }
}
