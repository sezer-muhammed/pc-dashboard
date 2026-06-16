"use client";

import { Server, Clock, Activity } from "lucide-react";
import { Surface } from "@/components/ui/surface";
import { MetricCard, LiveDot } from "@/components/dashboard/panel";
import { useRefresh } from "@/components/dashboard/refresh-context";
import { usePoll } from "@/lib/use-poll";
import { humanBytes, pct, uptime, usageColor } from "@/lib/format";
import type { SystemStatus, DiskReport } from "@/types/system";

export function HostOverview() {
  const { intervalMs, nonce } = useRefresh();
  const { data, error, lastUpdated } = usePoll<SystemStatus>(
    "/system/status/",
    intervalMs,
    false,
    nonce,
  );
  const { data: disk } = usePoll<DiskReport>("/system/disk/", intervalMs, false, nonce);
  const root = disk?.partitions.find((p) => p.mountpoint === "/") ?? disk?.partitions[0];

  return (
    <div className="flex flex-col gap-4">
      <Surface tone="raised" className="depth-surface flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-200)]">
            <Server className="h-5 w-5 text-[var(--ds-gray-1000)]" aria-hidden />
          </span>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">host</p>
            <p className="text-[20px] font-semibold leading-6 text-[var(--ds-gray-1000)]">
              {data?.hostname ?? "—"}
            </p>
            <p className="text-[12px] text-[var(--ds-gray-900)]">{data?.platform ?? "Loading host…"}</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <Meta icon={Clock} label="uptime" value={data ? uptime(data.uptime_seconds) : "—"} />
          <Meta
            icon={Activity}
            label="load avg"
            value={data?.load_average ? data.load_average.map((l) => l.toFixed(2)).join("  ") : "—"}
          />
          <LiveDot active={Boolean(lastUpdated)} error={Boolean(error)} />
        </div>
      </Surface>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="CPU"
          value={data ? pct(data.cpu_percent, 0) : "—"}
          sub={data ? `${data.cpu_count_logical ?? "?"} threads` : undefined}
          accent={usageColor(data?.cpu_percent)}
        />
        <MetricCard
          label="Memory"
          value={data ? pct(data.memory_percent, 0) : "—"}
          sub={data ? `${humanBytes(data.memory_used)} / ${humanBytes(data.memory_total)}` : undefined}
          accent={usageColor(data?.memory_percent)}
        />
        <MetricCard
          label="Swap"
          value={data ? pct(data.swap_percent, 0) : "—"}
          sub={data ? `${humanBytes(data.swap_used)} / ${humanBytes(data.swap_total)}` : undefined}
          accent={usageColor(data?.swap_percent)}
        />
        <MetricCard
          label="Memory free"
          value={data ? humanBytes(data.memory_available) : "—"}
          sub="available"
          accent="var(--ds-teal-700)"
        />
        <MetricCard
          label={root ? `Disk ${root.mountpoint}` : "Disk"}
          value={root ? pct(root.percent, 0) : "—"}
          sub={root ? `${root.used_human} / ${root.total_human}` : undefined}
          accent={usageColor(root?.percent)}
        />
        <MetricCard
          label="Disk free"
          value={root ? root.free_human : "—"}
          sub={root ? `of ${root.total_human}` : "free"}
          accent="var(--ds-teal-700)"
        />
      </div>
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="hidden flex-col items-end leading-tight sm:flex">
      <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-normal text-[var(--ds-gray-700)]">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </span>
      <span className="tabular-nums text-[13px] font-semibold text-[var(--ds-gray-1000)]">{value}</span>
    </div>
  );
}
