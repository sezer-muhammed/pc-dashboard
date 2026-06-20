"use client";

import { Fan } from "lucide-react";
import { Panel, EmptyRow } from "@/components/dashboard/panel";
import { usePoll } from "@/lib/use-poll";
import { useRefresh } from "@/components/dashboard/refresh-context";
import { tempColor } from "@/lib/format";
import type { TemperatureReport, TemperatureReading, FanReading } from "@/types/system";

// Map a temperature onto a 0–100 bar between ambient (20°C) and the sensor's
// critical/high threshold (fallback 100°C), so the bar shows thermal headroom.
function tempFill(t: TemperatureReading): number {
  const max = t.critical ?? t.high ?? 100;
  const span = Math.max(1, max - 20);
  return Math.min(100, Math.max(0, ((t.current ?? 0) - 20) / span) * 100);
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <span className="block h-1.5 w-full rounded-full border border-[var(--ds-gray-alpha-300)] bg-[var(--ds-background-200)] p-px">
      <span className="block h-full rounded-full" style={{ background: color, width: `${value}%` }} />
    </span>
  );
}

function SensorCell({ t }: { t: TemperatureReading }) {
  const limits = [t.high != null ? `high ${t.high.toFixed(0)}°` : null, t.critical != null ? `crit ${t.critical.toFixed(0)}°` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="min-w-0" title={[t.chip, t.label, limits].filter(Boolean).join(" · ")}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[11px] text-[var(--ds-gray-700)]">{t.label ?? t.chip}</span>
        <span className="shrink-0 text-[12px] font-semibold tabular-nums" style={{ color: tempColor(t.current) }}>
          {t.current != null ? `${t.current.toFixed(1)}°` : "—"}
        </span>
      </div>
      <div className="mt-1">
        <MiniBar value={tempFill(t)} color={tempColor(t.current)} />
      </div>
    </div>
  );
}

function FansSection({ fans }: { fans: FanReading[] }) {
  return (
    <div className="border-t border-[var(--ds-gray-alpha-300)] px-4 py-4">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-normal text-[var(--ds-gray-600)]">
        {fans.length} fan{fans.length === 1 ? "" : "s"}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {fans.map((f, i) => {
          const spinning = (f.rpm ?? 0) > 0;
          return (
            <div key={i} className="flex min-w-0 items-center gap-2">
              <Fan
                className={spinning ? "h-3.5 w-3.5 shrink-0 animate-spin text-[var(--ds-blue-700)]" : "h-3.5 w-3.5 shrink-0 text-[var(--ds-gray-500)]"}
                style={spinning ? { animationDuration: "2s" } : undefined}
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block truncate font-mono text-[10px] uppercase tracking-normal text-[var(--ds-gray-700)]" title={f.label ?? f.chip}>
                  {f.label ?? f.chip}
                </span>
                <span className="text-[12px] font-semibold tabular-nums text-[var(--ds-gray-1000)]">
                  {f.rpm != null ? `${f.rpm} RPM` : "—"}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TemperaturePanel() {
  const { intervalMs, nonce } = useRefresh();
  const { data, error, loading, refresh } = usePoll<TemperatureReport>(
    "/system/temperature/",
    intervalMs,
    false,
    nonce,
  );
  const temps = data?.temperatures ?? [];
  const fans = data?.fans ?? [];
  const hottest = temps.reduce<number | null>(
    (max, t) => (t.current != null && (max == null || t.current > max) ? t.current : max),
    null,
  );

  return (
    <Panel
      eyebrow="thermal"
      title="Temperature"
      summary={data ? `${temps.length} sensors${fans.length ? ` · ${fans.length} fans` : ""}` : "Loading…"}
      error={error}
      loading={loading}
      onRefresh={refresh}
      actions={
        hottest != null ? (
          <span className="tabular-nums text-[13px] font-semibold" style={{ color: tempColor(hottest) }}>
            {hottest.toFixed(1)}°C
          </span>
        ) : null
      }
    >
      {temps.length === 0 ? (
        <EmptyRow>No temperature sensors reported.</EmptyRow>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 sm:grid-cols-3">
            {temps.map((t, i) => (
              <SensorCell key={i} t={t} />
            ))}
          </div>
          {fans.length ? <FansSection fans={fans} /> : null}
        </>
      )}
    </Panel>
  );
}
