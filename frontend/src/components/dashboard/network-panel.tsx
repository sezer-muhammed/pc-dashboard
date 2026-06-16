"use client";

import { Panel, Mono } from "@/components/dashboard/panel";
import { RecordTable } from "@/components/ui/record-table";
import { StatusSignal } from "@/components/ui/status-signal";
import { usePoll } from "@/lib/use-poll";
import { useRefresh } from "@/components/dashboard/refresh-context";
import { bytesPerSec, humanBytes } from "@/lib/format";
import type { NetworkInterface } from "@/types/system";

function ipv4(iface: NetworkInterface): string {
  const a = iface.addresses.find((x) => x.address && x.address.includes(".") && !x.address.includes(":"));
  return a?.address ?? "—";
}

export function NetworkPanel() {
  const { intervalMs, nonce } = useRefresh();
  const { data, error, loading, refresh } = usePoll<NetworkInterface[]>(
    "/system/network/?interval=1",
    intervalMs,
    false,
    nonce,
  );
  // up interfaces first, then by recv throughput
  const rows = [...(data ?? [])].sort((a, b) => {
    if (a.is_up !== b.is_up) return a.is_up ? -1 : 1;
    return (b.bytes_recv_per_sec ?? 0) - (a.bytes_recv_per_sec ?? 0);
  });

  return (
    <Panel
      eyebrow="network"
      title="Network Interfaces"
      summary={data ? `${rows.filter((r) => r.is_up).length} up of ${rows.length}` : "Loading…"}
      error={error}
      loading={loading}
      onRefresh={refresh}
    >
      <RecordTable
        getRowId={(r: NetworkInterface) => r.name}
        rows={rows}
        minWidth={820}
        columns={[
          {
            key: "name",
            header: "Interface",
            render: (r) => (
              <StatusSignal color={r.is_up ? "var(--ds-green-700)" : "var(--ds-gray-500)"} variant="cell">
                <span className="font-medium">{r.name}</span>
              </StatusSignal>
            ),
          },
          { key: "ip", header: "Address", render: (r) => <Mono>{ipv4(r)}</Mono> },
          { key: "down", header: "↓ Recv/s", align: "right", render: (r) => <Mono className="text-[var(--ds-blue-900)]">{bytesPerSec(r.bytes_recv_per_sec)}</Mono> },
          { key: "up", header: "↑ Sent/s", align: "right", render: (r) => <Mono className="text-[var(--ds-teal-900)]">{bytesPerSec(r.bytes_sent_per_sec)}</Mono> },
          { key: "rtotal", header: "Recv", align: "right", render: (r) => <Mono>{humanBytes(r.bytes_recv)}</Mono> },
          { key: "stotal", header: "Sent", align: "right", render: (r) => <Mono>{humanBytes(r.bytes_sent)}</Mono> },
          { key: "speed", header: "Link", align: "right", render: (r) => <Mono>{r.speed_mbps ? `${r.speed_mbps} Mb` : "—"}</Mono> },
        ]}
      />
    </Panel>
  );
}
