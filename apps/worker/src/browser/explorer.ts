// import { chromium } from "playwright";
// import { inspectPage } from "./page.inspector.js";

// export async function exploreWebsite(url: string) {
//   const browser = await chromium.launch({
//     headless: true,
//   });

//   try {
//     const page = await browser.newPage();

//     await page.goto(url, {
//       waitUntil: "networkidle",
//       timeout: 30_000,
//     });

//     const analysis = await inspectPage(page);

//     await page.screenshot({
//       path: "homepage.png",
//       fullPage: true,
//     });

//     return analysis;
//   } finally {
//     await browser.close();
//   }
// }
