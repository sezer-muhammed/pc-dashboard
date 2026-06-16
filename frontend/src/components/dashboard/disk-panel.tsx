"use client";

import { useState } from "react";
import { Panel, Mono } from "@/components/dashboard/panel";
import { RecordTable } from "@/components/ui/record-table";
import { ProgressCell } from "@/components/ui/progress-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePoll } from "@/lib/use-poll";
import { useRefresh } from "@/components/dashboard/refresh-context";
import { bytesPerSec, humanBytes, pct, usageColor } from "@/lib/format";
import type { DiskReport, DiskPartition, DiskIO } from "@/types/system";

export function DiskPanel() {
  const [showVirtual, setShowVirtual] = useState(false);
  const { intervalMs, nonce } = useRefresh();
  const { data, error, loading, refresh } = usePoll<DiskReport>(
    "/system/disk/?interval=0.5",
    intervalMs,
    false,
    nonce,
  );

  const parts = (data?.partitions ?? []).filter(
    (p) => showVirtual || (p.fstype !== "squashfs" && !p.mountpoint.startsWith("/snap")),
  );
  const io = (data?.io ?? []).filter((d) => showVirtual || !d.device.startsWith("loop"));

  return (
    <Panel
      eyebrow="storage"
      title="Disks"
      summary={data ? `${parts.length} mounts · ${io.length} block devices` : "Loading…"}
      error={error}
      loading={loading}
      onRefresh={refresh}
      actions={
        <Button size="sm" variant="ghost" onClick={() => setShowVirtual((v) => !v)}>
          {showVirtual ? "Hide virtual" : "Show all"}
        </Button>
      }
    >
      <div className="px-4 pt-3">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">Partitions</p>
      </div>
      <RecordTable
        getRowId={(r: DiskPartition) => r.mountpoint}
        rows={parts}
        minWidth={760}
        columns={[
          { key: "mount", header: "Mount", render: (r) => <span className="font-medium">{r.mountpoint}</span> },
          { key: "fstype", header: "FS", render: (r) => <Badge tone="gray">{r.fstype || "—"}</Badge> },
          {
            key: "usage",
            header: "Usage",
            render: (r) => (
              <span className="flex items-center gap-2">
                <ProgressCell value={Math.round(r.percent)} color={usageColor(r.percent)} />
                <Mono className="text-[var(--ds-gray-1000)]">{pct(r.percent, 0)}</Mono>
              </span>
            ),
          },
          { key: "used", header: "Used", align: "right", render: (r) => <Mono>{r.used_human}</Mono> },
          { key: "free", header: "Free", align: "right", render: (r) => <Mono>{r.free_human}</Mono> },
          { key: "total", header: "Total", align: "right", render: (r) => <Mono>{r.total_human}</Mono> },
        ]}
      />
      <div className="px-4 pt-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">Block I/O (per second)</p>
      </div>
      <RecordTable
        getRowId={(r: DiskIO) => r.device}
        rows={io}
        minWidth={640}
        columns={[
          { key: "device", header: "Device", render: (r) => <span className="font-medium">{r.device}</span> },
          {
            key: "util",
            header: "Busy",
            render: (r) =>
              r.utilization_percent != null ? (
                <span className="flex items-center gap-2">
                  <ProgressCell value={Math.round(r.utilization_percent)} color={usageColor(r.utilization_percent)} />
                  <Mono className="text-[var(--ds-gray-1000)]">{pct(r.utilization_percent, 0)}</Mono>
                </span>
              ) : (
                <Mono>—</Mono>
              ),
          },
          { key: "read", header: "Read/s", align: "right", render: (r) => <Mono>{bytesPerSec(r.read_bytes_per_sec)}</Mono> },
          { key: "write", header: "Write/s", align: "right", render: (r) => <Mono>{bytesPerSec(r.write_bytes_per_sec)}</Mono> },
          { key: "rtotal", header: "Read total", align: "right", render: (r) => <Mono>{humanBytes(r.read_bytes)}</Mono> },
          { key: "wtotal", header: "Write total", align: "right", render: (r) => <Mono>{humanBytes(r.write_bytes)}</Mono> },
        ]}
      />
      <div className="h-3" />
    </Panel>
  );
}
