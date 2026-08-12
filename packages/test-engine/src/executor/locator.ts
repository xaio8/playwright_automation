import type { Page } from "@playwright/test";

export function getLocator(
  page: Page,
  target: {
    strategy: string;
    value: string;
  },
) {
  switch (target.strategy) {
    case "label":
      return page.getByLabel(target.value);

    case "text":
      return page.getByText(target.value);

    case "placeholder":
      return page.getByPlaceholder(target.value);

    case "testId":
      return page.getByTestId(target.value);

    default:
      throw new Error(`Unsupported locator strategy: ${target.strategy}`);
  }
}
