import { z } from "zod";

/**
 * What the browser worker extracts from a page and feeds to the AI provider.
 * Kept deliberately small: interactive elements plus structure, so prompts stay
 * within a predictable token budget.
 */
export const pageContextSchema = z.object({
  url: z.string(),
  title: z.string(),
  headings: z.array(z.object({ level: z.number().int(), text: z.string() })),
  buttons: z.array(
    z.object({
      text: z.string(),
      ariaLabel: z.string().nullable(),
      testId: z.string().nullable(),
      disabled: z.boolean(),
    }),
  ),
  inputs: z.array(
    z.object({
      type: z.string(),
      name: z.string().nullable(),
      label: z.string().nullable(),
      placeholder: z.string().nullable(),
      ariaLabel: z.string().nullable(),
      testId: z.string().nullable(),
      required: z.boolean(),
    }),
  ),
  links: z.array(z.object({ text: z.string(), href: z.string() })),
  forms: z.array(
    z.object({
      name: z.string().nullable(),
      action: z.string().nullable(),
      inputNames: z.array(z.string()),
    }),
  ),
  /** True when any collection was capped, so the model knows it saw a subset. */
  truncated: z.boolean(),
});

export type PageContext = z.infer<typeof pageContextSchema>;
