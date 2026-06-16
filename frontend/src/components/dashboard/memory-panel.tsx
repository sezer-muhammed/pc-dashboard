"use client";

import { Panel, Mono } from "@/components/dashboard/panel";
import { RecordTable } from "@/components/ui/record-table";
import { ProgressCell } from "@/components/ui/progress-cell";
import { usePoll } from "@/lib/use-poll";
import { humanBytes, pct, usageColor } from "@/lib/format";
import type { Memory, MemBlock } from "@/types/system";

type Row = { key: string; kind: string; block: MemBlock };

export function MemoryPanel({ intervalMs = 2000 }: { intervalMs?: number }) {
  const { data, error, loading, refresh } = usePoll<Memory>("/system/memory/", intervalMs);

  const rows: Row[] = data
    ? [
        { key: "ram", kind: "RAM", block: data.virtual },
        { key: "swap", kind: "Swap", block: data.swap },
      ]
    : [];

  return (
    <Panel
      eyebrow="memory"
      title="Memory"
      summary={data ? `${humanBytes(data.virtual.used)} of ${humanBytes(data.virtual.total)} used` : "Loading…"}
      error={error}
      loading={loading}
      onRefresh={refresh}
    >
      <RecordTable
        getRowId={(r: Row) => r.key}
        rows={rows}
        minWidth={520}
        columns={[
          { key: "kind", header: "Pool", render: (r) => <span className="font-medium">{r.kind}</span>, className: "w-24" },
          {
            key: "usage",
            header: "Usage",
            render: (r) => (
              <span className="flex items-center gap-3">
                <ProgressCell value={Math.round(r.block.percent)} color={usageColor(r.block.percent)} />
                <Mono className="text-[var(--ds-gray-1000)]">{pct(r.block.percent, 0)}</Mono>
              </span>
            ),
          },
          { key: "used", header: "Used", align: "right", render: (r) => <Mono>{humanBytes(r.block.used)}</Mono> },
          { key: "free", header: "Free", align: "right", render: (r) => <Mono>{humanBytes(r.block.free)}</Mono> },
          { key: "total", header: "Total", align: "right", render: (r) => <Mono>{humanBytes(r.block.total)}</Mono> },
        ]}
      />
    </Panel>
  );
}
