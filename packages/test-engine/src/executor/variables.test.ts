import { describe, expect, it } from "vitest";
import { resolveValue } from "./variables.js";

describe("resolveValue", () => {
  const env = { TEST_VARS_ALLOWLIST: "USER_EMAIL", USER_EMAIL: "a@b.c", SECRET: "s" };

  it("expands allowlisted placeholders", () => {
    expect(resolveValue("{{USER_EMAIL}}", { env })).toBe("a@b.c");
  });

  it("refuses env vars outside the allowlist", () => {
    expect(() => resolveValue("{{SECRET}}", { env })).toThrowError(
      /not allowlisted/,
    );
  });

  it("leaves plain values untouched", () => {
    expect(resolveValue("hello", { env })).toBe("hello");
  });
});
