function randomSuffix(): string {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(4);
    cryptoApi.getRandomValues(bytes);
    return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, '0');
}

/**
 * Generates a prefixed id, e.g. `"task-3f9ab2c1"`. Client-side because an
 * optimistic insert needs an id before the response arrives.
 */
export function createId(prefix: string): string {
  return `${prefix}-${randomSuffix()}`;
}
