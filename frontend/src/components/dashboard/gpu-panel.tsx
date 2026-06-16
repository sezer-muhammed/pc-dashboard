"use client";

import { Panel, Mono, EmptyRow } from "@/components/dashboard/panel";
import { RecordTable } from "@/components/ui/record-table";
import { ProgressCell } from "@/components/ui/progress-cell";
import { Badge } from "@/components/ui/badge";
import { usePoll } from "@/lib/use-poll";
import { useRefresh } from "@/components/dashboard/refresh-context";
import { pct, tempColor, usageColor } from "@/lib/format";
import type { GpuReport, Gpu } from "@/types/system";

export function GpuPanel() {
  const { intervalMs, nonce } = useRefresh();
  const { data, error, loading, refresh } = usePoll<GpuReport>(
    "/system/gpu/",
    intervalMs,
    false,
    nonce,
  );
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
      ) : (
        <RecordTable
          getRowId={(r: Gpu) => String(r.index)}
          rows={gpus}
          minWidth={760}
          columns={[
            { key: "name", header: "Device", render: (r) => <span className="font-medium">{r.name ?? `GPU ${r.index}`}</span> },
            {
              key: "util",
              header: "GPU",
              render: (r) => (
                <span className="flex items-center gap-2">
                  <ProgressCell value={Math.round(r.utilization_gpu_percent ?? 0)} color={usageColor(r.utilization_gpu_percent)} />
                  <Mono className="text-[var(--ds-gray-1000)]">{pct(r.utilization_gpu_percent, 0)}</Mono>
                </span>
              ),
            },
            {
              key: "vram",
              header: "VRAM",
              align: "right",
              render: (r) => (
                <Mono>
                  {r.memory_used_mb != null ? `${(r.memory_used_mb / 1024).toFixed(1)}` : "—"}/
                  {r.memory_total_mb != null ? `${(r.memory_total_mb / 1024).toFixed(0)} GB` : "—"}
                </Mono>
              ),
            },
            {
              key: "temp",
              header: "Temp",
              align: "right",
              render: (r) => (
                <span className="tabular-nums font-semibold" style={{ color: tempColor(r.temperature_c) }}>
                  {r.temperature_c != null ? `${r.temperature_c.toFixed(0)}°C` : "—"}
                </span>
              ),
            },
            { key: "power", header: "Power", align: "right", render: (r) => <Mono>{r.power_draw_w != null ? `${r.power_draw_w.toFixed(0)} W` : "—"}</Mono> },
            { key: "clock", header: "Clock", align: "right", render: (r) => <Mono>{r.clock_sm_mhz != null ? `${r.clock_sm_mhz.toFixed(0)} MHz` : "—"}</Mono> },
          ]}
        />
      )}
    </Panel>
  );
}
