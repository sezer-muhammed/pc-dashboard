"use client";

import type { ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/cn";

export function LiveDot({ active, error }: { active: boolean; error?: boolean }) {
  const color = error ? "var(--ds-red-700)" : active ? "var(--ds-green-700)" : "var(--ds-gray-500)";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn("inline-block h-2 w-2 rounded-full", active && !error && "animate-pulse")}
        style={{ background: color }}
      />
      <span className="font-mono text-[10px] uppercase tracking-normal text-[var(--ds-gray-700)]">
        {error ? "error" : active ? "live" : "idle"}
      </span>
    </span>
  );
}

export function Panel({
  eyebrow,
  title,
  summary,
  live = true,
  error,
  loading,
  onRefresh,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  summary?: string;
  live?: boolean;
  error?: string | null;
  loading?: boolean;
  onRefresh?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Surface tone="raised" className={cn("overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--ds-gray-alpha-400)] px-4 py-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-0.5 font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="truncate text-[15px] font-semibold leading-5 text-[var(--ds-gray-1000)]">
            {title}
          </h2>
          {summary ? (
            <p className="mt-0.5 truncate text-[12px] text-[var(--ds-gray-900)]">{summary}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <LiveDot active={live && !error} error={Boolean(error)} />
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Refresh"
              className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] text-[var(--ds-gray-900)] transition hover:bg-[var(--ds-gray-100)]"
            >
              <RotateCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
      {error ? (
        <div className="flex items-center gap-2 border-b border-[var(--ds-gray-alpha-300)] bg-[color-mix(in_srgb,var(--ds-red-100)_60%,var(--ds-background-100))] px-4 py-2 text-[12px] text-[var(--ds-red-900)]">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          <span className="truncate">{error}</span>
        </div>
      ) : null}
      {children}
    </Surface>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-8 text-center text-[13px] text-[var(--ds-gray-700)]">{children}</div>
  );
}

export function MetricCard({
  label,
  value,
  sub,
  accent = "var(--ds-gray-1000)",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
}) {
  return (
    <Surface tone="raised" className="p-4">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
        <p className="font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">
          {label}
        </p>
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-7 tabular-nums text-[var(--ds-gray-1000)]">
        {value}
      </p>
      {sub ? <p className="mt-1 text-[12px] text-[var(--ds-gray-900)]">{sub}</p> : null}
    </Surface>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-[12px] tabular-nums text-[var(--ds-gray-900)]", className)}>
      {children}
    </span>
  );
}
