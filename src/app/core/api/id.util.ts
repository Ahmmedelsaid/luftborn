/**
 * Client-side id generation.
 *
 * json-server would assign incrementing numeric ids, which would sit oddly
 * beside the fixtures' `task-001` style and break any code that assumes a
 * prefix. Generating ids here keeps the whole collection consistent and makes an
 * optimistic insert possible: the UI needs an id before the response arrives.
 */

/** Random hex suffix, using `crypto` where available. */
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

/** Generates a prefixed id, e.g. `createId('task')` -> `"task-3f9ab2c1"`. */
export function createId(prefix: string): string {
  return `${prefix}-${randomSuffix()}`;
}
