import { describe, expect, it } from "vitest";
import { assertSafeUrl, isPrivateAddress } from "./safe-url.js";

describe("isPrivateAddress", () => {
  it("flags loopback, private and link-local ranges", () => {
    for (const address of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "::1",
      "fd00::1",
    ]) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
  });

  it("allows public addresses", () => {
    expect(isPrivateAddress("93.184.216.34")).toBe(false);
    expect(isPrivateAddress("2606:2800:220:1::")).toBe(false);
  });
});

describe("assertSafeUrl", () => {
  it("rejects non-http protocols and malformed urls", async () => {
    await expect(assertSafeUrl("file:///etc/passwd", {})).rejects.toThrowError(
      /Unsupported protocol/,
    );
    await expect(assertSafeUrl("not a url", {})).rejects.toThrowError(
      /Not a valid URL/,
    );
  });

  it("rejects private targets unless explicitly allowed", async () => {
    await expect(assertSafeUrl("http://127.0.0.1:3000", {})).rejects.toThrowError(
      /private address/,
    );

    await expect(
      assertSafeUrl("http://127.0.0.1:3000", {
        ALLOW_PRIVATE_TARGETS: "true",
      }),
    ).resolves.toMatchObject({ hostname: "127.0.0.1" });
  });
});
