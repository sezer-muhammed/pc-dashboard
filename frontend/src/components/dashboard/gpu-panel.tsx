"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel, Mono, EmptyRow } from "@/components/dashboard/panel";
import { ProgressCell } from "@/components/ui/progress-cell";
import { Badge } from "@/components/ui/badge";
import { usePoll } from "@/lib/use-poll";
import { useRefresh } from "@/components/dashboard/refresh-context";
import { pct, mhz, tempColor, usageColor } from "@/lib/format";
import type { GpuReport, Gpu } from "@/types/system";

// Sample the GPU every 2s and keep the last minute (30 points) for the chart.
const SAMPLE_MS = 2000;
const HISTORY_POINTS = 30;
const GPU_COLOR = "var(--ds-blue-700)";
const VRAM_COLOR = "var(--ds-green-700)";

type Sample = { t: number; gpu: number; vram: number };

const gb = (mb: number | null | undefined) => (mb != null ? mb / 1024 : null);
const vramPct = (g: Gpu) =>
  g.utilization_memory_percent ??
  (g.memory_used_mb != null && g.memory_total_mb ? (g.memory_used_mb / g.memory_total_mb) * 100 : 0);

// Pauses sampling while the tab is hidden so history only grows when the page is open.
function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const sync = () => setVisible(document.visibilityState === "visible");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
  return visible;
}

// Accumulates a rolling per-device history, deduped on the poll's lastUpdated stamp.
function useGpuHistory(data: GpuReport | null, lastUpdated: number | null) {
  const [history, setHistory] = useState<Record<number, Sample[]>>({});
  const seen = useRef(0);
  useEffect(() => {
    if (!lastUpdated || lastUpdated === seen.current || !data?.available) return;
    seen.current = lastUpdated;
    setHistory((prev) => {
      const next: Record<number, Sample[]> = { ...prev };
      for (const g of data.gpus) {
        const idx = g.index ?? 0;
        const sample: Sample = { t: lastUpdated, gpu: Math.round(g.utilization_gpu_percent ?? 0), vram: Math.round(vramPct(g)) };
        next[idx] = [...(next[idx] ?? []), sample].slice(-HISTORY_POINTS);
      }
      return next;
    });
  }, [lastUpdated, data]);
  return history;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { dataKey?: string; value?: number }[] }) {
  if (!active || !payload?.length) return null;
  const get = (k: string) => payload.find((p) => p.dataKey === k)?.value ?? 0;
  return (
    <div className="rounded-[6px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-2 py-1 font-mono text-[10px] tabular-nums shadow-sm">
      <span style={{ color: GPU_COLOR }}>GPU {get("gpu")}%</span>
      <span className="mx-1.5 text-[var(--ds-gray-500)]">·</span>
      <span style={{ color: VRAM_COLOR }}>VRAM {get("vram")}%</span>
    </div>
  );
}

function GpuChart({ series }: { series: Sample[] }) {
  if (series.length < 2) {
    return (
      <div className="mt-3 flex h-20 items-center justify-center rounded-[6px] border border-dashed border-[var(--ds-gray-alpha-300)] text-[11px] text-[var(--ds-gray-600)]">
        Collecting history…
      </div>
    );
  }
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center gap-3 font-mono text-[10px] uppercase tracking-normal text-[var(--ds-gray-700)]">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: GPU_COLOR }} /> GPU
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: VRAM_COLOR }} /> VRAM
        </span>
        <span className="ml-auto normal-case text-[var(--ds-gray-600)]">last 60s</span>
      </div>
      <div className="h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
            <defs>
              <linearGradient id="gpuFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GPU_COLOR} stopOpacity={0.3} />
                <stop offset="100%" stopColor={GPU_COLOR} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="vramFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={VRAM_COLOR} stopOpacity={0.25} />
                <stop offset="100%" stopColor={VRAM_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={[0, 100]} hide />
            <XAxis dataKey="t" hide />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--ds-gray-alpha-400)" }} />
            <Area type="monotone" dataKey="vram" stroke={VRAM_COLOR} strokeWidth={1.5} fill="url(#vramFill)" isAnimationActive={false} dot={false} />
            <Area type="monotone" dataKey="gpu" stroke={GPU_COLOR} strokeWidth={1.5} fill="url(#gpuFill)" isAnimationActive={false} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BarRow({ label, value, color, right }: { label: string; value: number | null | undefined; color: string; right: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-10 shrink-0 font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">{label}</span>
      <ProgressCell className="flex-1" value={Math.round(value ?? 0)} color={color} />
      <Mono className="shrink-0 text-[var(--ds-gray-1000)]">{right}</Mono>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[10px] uppercase tracking-normal text-[var(--ds-gray-700)]">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-semibold tabular-nums" style={{ color: accent ?? "var(--ds-gray-1000)" }}>
        {value}
      </p>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 flex-1 border-l border-[var(--ds-gray-alpha-300)] pl-3 first:border-l-0 first:pl-0">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-normal text-[var(--ds-gray-600)]">{title}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">{children}</div>
    </div>
  );
}

function GpuCard({ gpu, series }: { gpu: Gpu; series: Sample[] }) {
  const used = gb(gpu.memory_used_mb);
  const total = gb(gpu.memory_total_mb);
  return (
    <div className="border-b border-[var(--ds-gray-alpha-300)] px-4 py-4 last:border-b-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-semibold text-[var(--ds-gray-1000)]">{gpu.name ?? `GPU ${gpu.index}`}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge tone="gray">#{gpu.index}</Badge>
          {gpu.temperature_c != null ? (
            <span className="font-mono text-[11px] font-semibold tabular-nums" style={{ color: tempColor(gpu.temperature_c) }}>
              {gpu.temperature_c.toFixed(0)}°C
            </span>
          ) : null}
        </div>
      </div>

      <div className="mb-4 space-y-2">
        <BarRow label="GPU" value={gpu.utilization_gpu_percent} color={usageColor(gpu.utilization_gpu_percent)} right={pct(gpu.utilization_gpu_percent, 0)} />
        <BarRow
          label="VRAM"
          value={vramPct(gpu)}
          color={usageColor(gpu.utilization_memory_percent)}
          right={used != null && total != null ? `${used.toFixed(1)} / ${total.toFixed(0)} GB` : "—"}
        />
      </div>

      <div className="flex gap-3">
        <Group title="memory">
          <Stat label="Used" value={used != null ? `${used.toFixed(1)} GB` : "—"} />
          <Stat label="Free" value={gb(gpu.memory_free_mb) != null ? `${gb(gpu.memory_free_mb)!.toFixed(1)} GB` : "—"} />
          <Stat label="Mem Util" value={pct(gpu.utilization_memory_percent, 0)} />
          <Stat label="Mem Clk" value={mhz(gpu.clock_memory_mhz)} />
        </Group>
        <Group title="thermal · power">
          <Stat label="Temp" value={gpu.temperature_c != null ? `${gpu.temperature_c.toFixed(0)}°C` : "—"} accent={tempColor(gpu.temperature_c)} />
          <Stat label="Fan" value={pct(gpu.fan_speed_percent, 0)} />
          <Stat
            label="Power"
            value={
              gpu.power_draw_w != null
                ? `${gpu.power_draw_w.toFixed(0)}${gpu.power_limit_w != null ? ` / ${gpu.power_limit_w.toFixed(0)}` : ""} W`
                : "—"
            }
          />
          <Stat label="SM Clk" value={mhz(gpu.clock_sm_mhz)} />
        </Group>
      </div>

      <GpuChart series={series} />
    </div>
  );
}

export function GpuPanel() {
  const { nonce } = useRefresh();
  const visible = usePageVisible();
  // Fixed 2s cadence drives the live chart; pause sampling while the tab is hidden.
  const { data, error, loading, lastUpdated, refresh } = usePoll<GpuReport>(
    "/system/gpu/",
    SAMPLE_MS,
    !visible,
    nonce,
  );
  const history = useGpuHistory(data, lastUpdated);
  const gpus = data?.gpus ?? [];

  return (
    <Panel
      eyebrow="graphics"
      title="GPU"
      summary={data ? (data.available ? `${gpus.length} device(s)` : "No NVIDIA device available") : "Loading…"}
      error={error}
      loading={loading}
      onRefresh={refresh}
      actions={
        data ? (
          <Badge tone={data.available ? "green" : "amber"}>{data.available ? "online" : "offline"}</Badge>
        ) : null
      }
    >
      {data && !data.available ? (
        <EmptyRow>
          <span className="font-medium text-[var(--ds-gray-900)]">nvidia-smi unavailable.</span>
          {data.reason ? <span className="mt-1 block font-mono text-[11px] text-[var(--ds-gray-700)]">{data.reason}</span> : null}
        </EmptyRow>
      ) : gpus.length === 0 ? (
        <EmptyRow>No devices reported.</EmptyRow>
      ) : (
        gpus.map((g) => <GpuCard key={String(g.index)} gpu={g} series={history[g.index ?? 0] ?? []} />)
      )}
    </Panel>
  );
}
