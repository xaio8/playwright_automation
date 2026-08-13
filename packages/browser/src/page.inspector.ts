// The `page.evaluate` callback below runs inside the browser, so this file
// needs DOM types regardless of the consuming package's `lib` setting.
/// <reference lib="dom" />
import type { Page } from "playwright";
import { pageContextSchema, type PageContext } from "@ai-tester/shared";

/** Caps per collection, to keep prompt size (and cost) predictable. */
export const INSPECT_LIMITS = {
  headings: 30,
  buttons: 40,
  inputs: 40,
  links: 50,
  forms: 10,
} as const;

const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";
const BUTTON_SELECTOR =
  "button, [role='button'], input[type='submit'], input[type='button']";
const FIELD_SELECTOR = "input, textarea, select";

/**
 * Extracts the interactive surface of a page for the AI prompt.
 *
 * The page-side callback deliberately declares no helper functions and repeats
 * the whitespace-collapsing expression: bundlers running this through esbuild's
 * `keepNames` transform would emit a `__name` call that does not exist in the
 * page context.
 */
export async function inspectPage(page: Page): Promise<PageContext> {
  const raw = await page.evaluate(
    ({ limits, selectors }) => {
      const headingElements = Array.from(
        document.querySelectorAll(selectors.heading),
      );
      const buttonElements = Array.from(
        document.querySelectorAll<HTMLElement>(selectors.button),
      );
      const fieldElements = Array.from(
        document.querySelectorAll<HTMLInputElement>(selectors.field),
      ).filter((field) => field.type !== "hidden");
      const linkElements = Array.from(document.querySelectorAll("a[href]"));
      const formElements = Array.from(document.querySelectorAll("form"));

      return {
        url: window.location.href,
        title: document.title,
        headings: headingElements.slice(0, limits.headings).map((heading) => ({
          level: Number(heading.tagName.slice(1)),
          text: (heading.textContent ?? "").replace(/\s+/g, " ").trim(),
        })),
        buttons: buttonElements.slice(0, limits.buttons).map((button) => ({
          text: (
            button.textContent ||
            (button as HTMLInputElement).value ||
            button.getAttribute("aria-label") ||
            ""
          )
            .replace(/\s+/g, " ")
            .trim(),
          ariaLabel: button.getAttribute("aria-label"),
          testId: button.getAttribute("data-testid"),
          disabled: button.hasAttribute("disabled"),
        })),
        inputs: fieldElements.slice(0, limits.inputs).map((field) => ({
          type: field.type,
          name: field.getAttribute("name"),
          label:
            (
              field.labels?.[0]?.textContent ??
              field.closest("label")?.textContent ??
              ""
            )
              .replace(/\s+/g, " ")
              .trim() || null,
          placeholder: field.getAttribute("placeholder"),
          ariaLabel: field.getAttribute("aria-label"),
          testId: field.getAttribute("data-testid"),
          required: field.required,
        })),
        links: linkElements.slice(0, limits.links).map((link) => ({
          text: (link.textContent ?? "").replace(/\s+/g, " ").trim(),
          href: (link as HTMLAnchorElement).href,
        })),
        forms: formElements.slice(0, limits.forms).map((form) => ({
          name: form.getAttribute("name"),
          action: form.getAttribute("action"),
          inputNames: Array.from(form.querySelectorAll(selectors.field))
            .map((field) => field.getAttribute("name"))
            .filter((name) => typeof name === "string"),
        })),
        truncated:
          headingElements.length > limits.headings ||
          buttonElements.length > limits.buttons ||
          fieldElements.length > limits.inputs ||
          linkElements.length > limits.links ||
          formElements.length > limits.forms,
      };
    },
    {
      limits: INSPECT_LIMITS,
      selectors: {
        heading: HEADING_SELECTOR,
        button: BUTTON_SELECTOR,
        field: FIELD_SELECTOR,
      },
    },
  );

  return pageContextSchema.parse(raw);
}
