import type { Page } from "@playwright/test";
import { describe, expect, it, vi } from "vitest";

import { executeStep } from "./execute.step.js";

function fakePage(): { page: Page; goto: ReturnType<typeof vi.fn> } {
  const goto = vi.fn(async () => null);

  return { page: { goto } as unknown as Page, goto };
}

describe("executeStep goto", () => {
  it("refuses non-http schemes in a plan step", async () => {
    const { page, goto } = fakePage();

    await expect(
      executeStep(page, { action: "goto", url: "file:///etc/passwd" }),
    ).rejects.toThrowError(/Unsupported protocol/);
    expect(goto).not.toHaveBeenCalled();
  });

  it("refuses private addresses in a plan step", async () => {
    const { page, goto } = fakePage();

    await expect(
      executeStep(page, { action: "goto", url: "http://127.0.0.1:8099/" }),
    ).rejects.toThrowError(/private address/);
    expect(goto).not.toHaveBeenCalled();
  });

  it("navigates to a public url", async () => {
    const { page, goto } = fakePage();

    await executeStep(page, { action: "goto", url: "https://example.com/" });

    expect(goto).toHaveBeenCalledWith("https://example.com/", {});
  });
});
