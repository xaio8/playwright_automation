export interface ResolveOptions {
  env?: Record<string, string | undefined>;
  /**
   * Variable names a plan is allowed to read, defaulting to
   * `TEST_VARS_ALLOWLIST` (comma separated). Generated plans come from an
   * untrusted page, so they must not be able to read arbitrary process env.
   */
  allowlist?: string[];
}

function readAllowlist(env: Record<string, string | undefined>): string[] {
  return (env.TEST_VARS_ALLOWLIST ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

/** Expands `{{VAR}}` placeholders from the allowlisted environment. */
export function resolveValue(value: string, options: ResolveOptions = {}): string {
  const env = options.env ?? process.env;
  const allowlist = options.allowlist ?? readAllowlist(env);

  return value.replace(/\{\{([^}]+)\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();

    if (!allowlist.includes(key)) {
      throw new Error(
        `Variable ${key} is not allowlisted; add it to TEST_VARS_ALLOWLIST`,
      );
    }

    const result = env[key];

    if (!result) {
      throw new Error(`Missing environment variable: ${key}`);
    }

    return result;
  });
}
