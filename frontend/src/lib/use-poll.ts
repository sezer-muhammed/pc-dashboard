"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet, ApiError } from "@/lib/api";

export type PollState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  lastUpdated: number | null;
  refresh: () => void;
};

// Polls an API path on an interval. `intervalMs` is the wall-clock gap between
// completed requests; set 0 to fetch once. `paused` halts polling. Bumping
// `nonce` forces an immediate refetch (used by the global "refresh all").
export function usePoll<T>(
  path: string,
  intervalMs = 3000,
  paused = false,
  nonce = 0,
): PollState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  const tick = useCallback(async () => {
    const controller = new AbortController();
    try {
      const result = await apiGet<T>(path, controller.signal);
      if (!alive.current) return;
      setData(result);
      setError(null);
      setLastUpdated(Date.now());
    } catch (err) {
      if (!alive.current) return;
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error && err.name !== "AbortError") setError(err.message);
    } finally {
      if (alive.current) setLoading(false);
      if (alive.current && intervalMs > 0 && !paused) {
        timer.current = setTimeout(tick, intervalMs);
      }
    }
  }, [path, intervalMs, paused]);

  const refresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setLoading(true);
    void tick();
  }, [tick]);

  useEffect(() => {
    alive.current = true;
    if (paused) {
      setLoading(false);
      return;
    }
    void tick();
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [tick, paused]);

  // Force an immediate refetch when the global refresh nonce changes (skip mount).
  const firstNonce = useRef(true);
  useEffect(() => {
    if (firstNonce.current) {
      firstNonce.current = false;
      return;
    }
    refresh();
  }, [nonce, refresh]);

  return { data, error, loading, lastUpdated, refresh };
}
