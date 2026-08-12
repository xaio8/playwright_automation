import { chromium } from "playwright";
import type { PageContext } from "@ai-tester/shared";
import { inspectPage } from "./page.inspector.js";
import { assertSafeUrl } from "./safe-url.js";

export interface ExploreOptions {
  headless?: boolean;
  navigationTimeoutMs?: number;
  /** Capture a full-page PNG for vision-capable providers. */
  screenshot?: boolean;
}

export interface ExploreResult {
  page: PageContext;
  screenshot?: { mimeType: string; base64: string };
}

export async function exploreWebsite(
  url: string,
  options: ExploreOptions = {},
): Promise<ExploreResult> {
  const {
    headless = true,
    navigationTimeoutMs = 30_000,
    screenshot = false,
  } = options;

  const safeUrl = await assertSafeUrl(url);
  const browser = await chromium.launch({ headless });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(safeUrl.toString(), {
      waitUntil: "domcontentloaded",
      timeout: navigationTimeoutMs,
    });

    const pageContext = await inspectPage(page);

    if (!screenshot) {
      return { page: pageContext };
    }

    const buffer = await page.screenshot({ fullPage: true });

    return {
      page: pageContext,
      screenshot: { mimeType: "image/png", base64: buffer.toString("base64") },
    };
  } finally {
    await browser.close();
  }
}
