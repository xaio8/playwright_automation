export function resolveValue(value: string): string {
  return value.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    const result = process.env[key];

    if (!result) {
      throw new Error(`Missing environment variable: ${key}`);
    }

    return result;
  });
}
