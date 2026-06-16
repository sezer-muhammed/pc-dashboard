"use client";

// Tiny in-memory response cache (per browser tab). Lets panels show data
// instantly when you switch pages instead of refetching, while still
// revalidating in the background (stale-while-revalidate).

type Entry = { data: unknown; ts: number };

const store = new Map<string, Entry>();

export const CACHE_TTL_MS = 20_000;

export function getCached<T>(key: string, maxAgeMs = CACHE_TTL_MS): T | undefined {
  const e = store.get(key);
  if (e && Date.now() - e.ts <= maxAgeMs) return e.data as T;
  return undefined;
}

export function setCached(key: string, data: unknown): void {
  store.set(key, { data, ts: Date.now() });
}
