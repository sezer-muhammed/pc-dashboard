"use client";

import { Panel, Mono } from "@/components/dashboard/panel";
import { RecordTable } from "@/components/ui/record-table";
import { ProgressCell } from "@/components/ui/progress-cell";
import { usePoll } from "@/lib/use-poll";
import { useRefresh } from "@/components/dashboard/refresh-context";
import { mhz, pct, usageColor } from "@/lib/format";
import type { Cpu } from "@/types/system";

type Core = { i: number; usage: number; freq: number | null };

export function CpuPanel() {
  const { intervalMs, nonce } = useRefresh();
  const { data, error, loading, refresh } = usePoll<Cpu>(
    "/system/cpu/?interval=0.3",
    intervalMs,
    false,
    nonce,
  );

  const cores: Core[] = (data?.per_core_percent ?? []).map((usage, i) => ({
    i,
    usage,
    freq: data?.per_core_frequency_mhz?.[i] ?? null,
  }));

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
      actions={
        data ? (
          <span className="hidden items-center gap-3 sm:flex">
            <Stat label="total" value={pct(data.percent)} color={usageColor(data.percent)} />
            <Stat label="load" value={data.load_average?.map((l) => l.toFixed(2)).join(" ") ?? "—"} />
          </span>
        ) : null
      }
    >
      <RecordTable
        getRowId={(r: Core) => String(r.i)}
        rows={cores}
        minWidth={420}
        columns={[
          {
            key: "core",
            header: "Core",
            render: (r) => <Mono>#{String(r.i).padStart(2, "0")}</Mono>,
            className: "w-20",
          },
          {
            key: "usage",
            header: "Usage",
            render: (r) => (
              <span className="flex items-center gap-3">
                <ProgressCell value={Math.round(r.usage)} color={usageColor(r.usage)} />
                <Mono className="text-[var(--ds-gray-1000)]">{pct(r.usage, 0)}</Mono>
              </span>
            ),
          },
          {
            key: "freq",
            header: "Frequency",
            align: "right",
            render: (r) => <Mono>{mhz(r.freq)}</Mono>,
          },
        ]}
      />
    </Panel>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <span className="flex flex-col items-end leading-tight">
      <span className="font-mono text-[10px] uppercase tracking-normal text-[var(--ds-gray-700)]">
        {label}
      </span>
      <span className="tabular-nums text-[13px] font-semibold" style={{ color: color ?? "var(--ds-gray-1000)" }}>
        {value}
      </span>
    </span>
  );
}
