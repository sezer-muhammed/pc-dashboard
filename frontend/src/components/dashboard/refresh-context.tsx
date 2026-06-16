"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";

type RefreshValue = {
  intervalMs: number; // 0 = off (fetch once, manual refresh only)
  setIntervalMs: (n: number) => void;
  nonce: number; // bump to force every panel to refetch now
  refreshAll: () => void;
};

const RefreshContext = createContext<RefreshValue>({
  intervalMs: 0,
  setIntervalMs: () => {},
  nonce: 0,
  refreshAll: () => {},
});

export const useRefresh = () => useContext(RefreshContext);

export const REFRESH_OPTIONS = [
  { label: "Off", value: 0 },
  { label: "5s", value: 5000 },
  { label: "30s", value: 30000 },
  { label: "60s", value: 60000 },
] as const;

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [intervalMs, setIntervalMs] = useState(0); // default: off
  const [nonce, setNonce] = useState(0);
  const refreshAll = useCallback(() => setNonce((n) => n + 1), []);
  return (
    <RefreshContext.Provider value={{ intervalMs, setIntervalMs, nonce, refreshAll }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function RefreshControl() {
  const { intervalMs, setIntervalMs, refreshAll } = useRefresh();
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={refreshAll}
        aria-label="Refresh all now"
        title="Refresh all"
        className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] text-[var(--ds-gray-900)] transition hover:bg-[var(--ds-gray-100)]"
      >
        <RotateCw className="h-3.5 w-3.5" aria-hidden />
      </button>
      <div className="hidden items-center gap-1 sm:flex">
        <span className="font-mono text-[10px] uppercase tracking-normal text-[var(--ds-gray-600)]">
          auto
        </span>
        <div className="inline-flex rounded-[8px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-200)] p-0.5">
          {REFRESH_OPTIONS.map((o) => {
            const active = intervalMs === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setIntervalMs(o.value)}
                className={cn(
                  "h-6 rounded-[6px] px-2 text-[12px] font-medium tabular-nums transition",
                  active
                    ? "bg-[var(--ds-background-100)] text-[var(--ds-gray-1000)] shadow-[0_1px_1px_rgb(0_0_0_/_0.06),inset_0_0_0_1px_var(--ds-gray-alpha-400)]"
                    : "text-[var(--ds-gray-700)] hover:text-[var(--ds-gray-1000)]",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
