// Stand-in for the old "base44:runtime" module: secrets come from server environment variables.
const env = (k: string) => (typeof process !== "undefined" ? process.env[k] : undefined);

(globalThis as any).Deno ??= { env: { get: env, toObject: () => ({ ...process.env }) } };

export const secrets = { get: env };

// Background work runs inline (the request waits for it).
export function waitUntil(p: Promise<unknown>) {
  return Promise.resolve(p).catch((e) => console.error("[legacy waitUntil]", e));
}
