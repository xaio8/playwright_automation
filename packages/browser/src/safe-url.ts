import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

/** Loopback, private, link-local, CGNAT and unique-local ranges. */
export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();

    return (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80") ||
      normalized.startsWith("::ffff:")
    );
  }

  const parts = address.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const [a = 0, b = 0] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

/**
 * Guards against SSRF: users submit arbitrary URLs that a browser inside our
 * network would otherwise fetch. Set `ALLOW_PRIVATE_TARGETS=true` to test
 * against localhost during development.
 */
export async function assertSafeUrl(
  rawUrl: string,
  env: Record<string, string | undefined> = process.env,
): Promise<URL> {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError(`Not a valid URL: ${rawUrl}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError(`Unsupported protocol: ${url.protocol}`);
  }

  if (env.ALLOW_PRIVATE_TARGETS === "true") {
    return url;
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true })).map((entry) => entry.address);

  if (addresses.length === 0) {
    throw new UnsafeUrlError(`Could not resolve host: ${host}`);
  }

  for (const address of addresses) {
    if (isPrivateAddress(address)) {
      throw new UnsafeUrlError(
        `Refusing to browse a private address (${host} → ${address})`,
      );
    }
  }

  return url;
}
