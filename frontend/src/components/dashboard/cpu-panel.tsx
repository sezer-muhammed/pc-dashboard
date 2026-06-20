"use client";

import type { ReactNode } from "react";
import { Panel, Mono } from "@/components/dashboard/panel";
import { usePoll } from "@/lib/use-poll";
import { useRefresh } from "@/components/dashboard/refresh-context";
import { mhz, pct, tempColor, usageColor } from "@/lib/format";
import type { Cpu } from "@/types/system";

const USER = "var(--ds-blue-700)";
const SYSTEM = "var(--ds-amber-700)";
const IOWAIT = "var(--ds-red-700)";
const IDLE = "var(--ds-gray-200)";

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <span className="block h-1.5 w-full rounded-full border border-[var(--ds-gray-alpha-300)] bg-[var(--ds-background-200)] p-px">
      <span className="block h-full rounded-full" style={{ background: color, width: `${Math.min(100, Math.max(0, value))}%` }} />
    </span>
  );
}

function Tile({ label, value, accent, swatch }: { label: string; value: ReactNode; accent?: string; swatch?: string }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-normal text-[var(--ds-gray-700)]">
        {swatch ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: swatch }} /> : null}
        {label}
      </p>
      <p className="mt-0.5 truncate text-[13px] font-semibold tabular-nums" style={{ color: accent ?? "var(--ds-gray-1000)" }}>
        {value}
      </p>
    </div>
  );
}

function Overview({ data }: { data: Cpu }) {
  const t = data.times_percent;
  const segs = [
    { label: "User", value: t.user, color: USER },
    { label: "System", value: t.system, color: SYSTEM },
    { label: "I/O Wait", value: t.iowait ?? 0, color: IOWAIT },
    { label: "Idle", value: t.idle, color: IDLE },
  ];
  return (
    <div className="border-b border-[var(--ds-gray-alpha-300)] px-4 py-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-[var(--ds-gray-1000)]">Load distribution</span>
        <Mono className="text-[var(--ds-gray-1000)]">
          <span style={{ color: usageColor(data.percent) }}>{pct(data.percent, 0)}</span> total
        </Mono>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full border border-[var(--ds-gray-alpha-300)] bg-[var(--ds-background-200)]">
        {segs.map((s) => (s.value > 0 ? <span key={s.label} title={`${s.label} · ${s.value.toFixed(1)}%`} style={{ width: `${s.value}%`, background: s.color }} /> : null))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
        <Tile label="User" value={pct(t.user, 1)} swatch={USER} />
        <Tile label="System" value={pct(t.system, 1)} swatch={SYSTEM} />
        {t.iowait != null ? <Tile label="I/O Wait" value={pct(t.iowait, 1)} swatch={IOWAIT} /> : null}
        <Tile label="Idle" value={pct(t.idle, 1)} swatch={IDLE} />
        <Tile label="Clock" value={mhz(data.frequency_mhz)} />
        <Tile
          label="Range"
          value={data.frequency_min_mhz != null && data.frequency_max_mhz != null ? `${mhz(data.frequency_min_mhz)} – ${mhz(data.frequency_max_mhz)}` : "—"}
        />
        <Tile label="Temp" value={data.temperature_c != null ? `${data.temperature_c.toFixed(0)}°C` : "—"} accent={tempColor(data.temperature_c)} />
        <Tile label="Load avg" value={data.load_average?.map((l) => l.toFixed(2)).join("  ") ?? "—"} />
      </div>
    </div>
  );
}

function CoreGrid({ data }: { data: Cpu }) {
  const cores = (data.per_core_percent ?? []).map((usage, i) => ({
    i,
    usage,
    freq: data.per_core_frequency_mhz?.[i] ?? null,
    temp: data.per_core_temp_c?.[i] ?? null,
  }));
  return (
    <div className="px-4 py-4">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-normal text-[var(--ds-gray-700)]">
        {cores.length} logical core{cores.length === 1 ? "" : "s"}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        {cores.map((c) => (
          <div key={c.i} className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <Mono className="text-[var(--ds-gray-900)]">#{String(c.i).padStart(2, "0")}</Mono>
              <Mono className="text-[var(--ds-gray-1000)]">{pct(c.usage, 0)}</Mono>
            </div>
            <div className="mt-1">
              <MiniBar value={c.usage} color={usageColor(c.usage)} />
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-mono text-[10px] tabular-nums text-[var(--ds-gray-600)]">{mhz(c.freq)}</span>
              {c.temp != null ? (
                <span className="font-mono text-[10px] tabular-nums" style={{ color: tempColor(c.temp) }}>{c.temp.toFixed(0)}°C</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CpuPanel() {
  const { intervalMs, nonce } = useRefresh();
  const { data, error, loading, refresh } = usePoll<Cpu>(
    "/system/cpu/?interval=0.3",
    intervalMs,
    false,
    nonce,
  );

  return (
    <Panel
      eyebrow="processor"
      title="CPU"
      summary={
        data
          ? `${data.count_physical ?? "?"} cores / ${data.count_logical ?? "?"} threads · ${mhz(data.frequency_mhz)}`
          : "Loading…"
      }
      error={error}
      loading={loading}
      onRefresh={refresh}
    >
      {data ? (
        <>
          <Overview data={data} />
          <CoreGrid data={data} />
        </>
      ) : (
        <div className="px-4 py-8 text-center text-[13px] text-[var(--ds-gray-700)]">Loading…</div>
      )}
    </Panel>
  );
}
