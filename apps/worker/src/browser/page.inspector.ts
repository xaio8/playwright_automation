// import { Page } from "playwright";

// export interface PageAnalysis {
//   url: string;
//   title: string;

//   buttons: Array<{
//     text: string;
//     ariaLabel: string | null;
//   }>;

//   inputs: Array<{
//     type: string;
//     name: string | null;
//     placeholder: string | null;
//     ariaLabel: string | null;
//     required: boolean;
//   }>;

//   links: Array<{
//     text: string;
//     href: string;
//   }>;

//   headings: string[];
// }

// export async function inspectPage(page: Page): Promise<PageAnalysis> {
//   return page.evaluate(() => {
//     return {
//       url: window.location.href,

//       title: document.title,

//       buttons: Array.from(document.querySelectorAll("button")).map(
//         (button) => ({
//           text: button.innerText.trim(),

//           ariaLabel: button.getAttribute("aria-label"),
//         }),
//       ),

//       inputs: Array.from(document.querySelectorAll("input")).map((input) => ({
//         type: input.type,

//         name: input.getAttribute("name"),

//         placeholder: input.getAttribute("placeholder"),

//         ariaLabel: input.getAttribute("aria-label"),

//         required: input.required,
//       })),

//       links: Array.from(document.querySelectorAll("a")).map((link) => ({
//         text: link.textContent?.trim() ?? "",

//         href: link.href,
//       })),

//       headings: Array.from(
//         document.querySelectorAll("h1, h2, h3, h4, h5, h6"),
//       ).map((heading) => heading.textContent?.trim() ?? ""),
//     };
//   });
// }
