import "dotenv/config";
import { chromium } from "playwright";
import { OpenRouterProvider } from "@ai-tester/ai";
import { runTestPlan } from "@ai-tester/test-engine";

async function main() {
  const url = process.argv[2] ?? "https://example.com";

  // 1. Open website
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);

  // 2. Inspect DOM
  const pageData = await page.evaluate(() => ({
    title: document.title,
    url: window.location.href,
    buttons: Array.from(document.querySelectorAll("button")).map((button) => ({
      text: button.textContent?.trim(),
      ariaLabel: button.getAttribute("aria-label"),
    })),

    inputs: Array.from(document.querySelectorAll("input")).map((input) => ({
      type: input.type,
      name: input.getAttribute("name"),
      placeholder: input.getAttribute("placeholder"),
      required: input.required,
    })),
  }));

  await browser.close();
  console.log("Page analysis:", pageData);

  // 3. Ask AI
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing");
  }
  const ai = new OpenRouterProvider(apiKey);
  const testPlan = await ai.generateTestPlan(pageData);

  console.log("\nGenerated Test Plan:");

  const results = await runTestPlan(testPlan);

  console.log("\nTest Results:");

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
