import { z } from "zod";

/**
 * How a step finds an element. `role` carries an accessible name instead of a
 * selector string so it maps directly onto `page.getByRole(role, { name })`.
 */
export const locatorSchema = z.discriminatedUnion("strategy", [
  z.object({
    strategy: z.literal("role"),
    role: z.enum([
      "button",
      "link",
      "textbox",
      "checkbox",
      "radio",
      "combobox",
      "heading",
      "list",
      "listitem",
      "img",
      "dialog",
      "alert",
      "table",
      "tab",
      "menuitem",
    ]),
    name: z.string().optional(),
    exact: z.boolean().optional(),
  }),
  z.object({ strategy: z.literal("label"), value: z.string() }),
  z.object({ strategy: z.literal("text"), value: z.string() }),
  z.object({ strategy: z.literal("placeholder"), value: z.string() }),
  z.object({ strategy: z.literal("testid"), value: z.string() }),
  z.object({ strategy: z.literal("css"), value: z.string() }),
]);

const stepBase = { description: z.string().optional() };

/**
 * Steps are a discriminated union so every action carries exactly the fields it
 * needs: the executor never has to guess whether `target`/`value` is present.
 */
export const testStepSchema = z.discriminatedUnion("action", [
  z.object({ ...stepBase, action: z.literal("goto"), url: z.string() }),
  z.object({ ...stepBase, action: z.literal("click"), target: locatorSchema }),
  z.object({
    ...stepBase,
    action: z.literal("fill"),
    target: locatorSchema,
    value: z.string(),
  }),
  z.object({
    ...stepBase,
    action: z.literal("press"),
    target: locatorSchema,
    key: z.string(),
  }),
  z.object({
    ...stepBase,
    action: z.literal("expect-visible"),
    target: locatorSchema,
  }),
  z.object({
    ...stepBase,
    action: z.literal("expect-text"),
    target: locatorSchema,
    value: z.string(),
  }),
  z.object({
    ...stepBase,
    action: z.literal("expect-url"),
    value: z.string(),
  }),
]);

export const testCategorySchema = z.enum([
  "happy-path",
  "validation",
  "negative",
  "boundary",
]);

export const testCaseSchema = z.object({
  title: z.string(),
  category: testCategorySchema,
  description: z.string(),
  steps: z.array(testStepSchema).min(1),
});

export const testPlanSchema = z.object({
  feature: z.string(),
  testCases: z.array(testCaseSchema).min(1),
});

export type Locator = z.infer<typeof locatorSchema>;
export type LocatorStrategy = Locator["strategy"];
export type TestStep = z.infer<typeof testStepSchema>;
export type TestStepAction = TestStep["action"];
export type TestCategory = z.infer<typeof testCategorySchema>;
export type TestCase = z.infer<typeof testCaseSchema>;
export type TestPlan = z.infer<typeof testPlanSchema>;
