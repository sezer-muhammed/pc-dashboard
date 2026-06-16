"use client";

import { Panel, Mono, EmptyRow } from "@/components/dashboard/panel";
import { RecordTable } from "@/components/ui/record-table";
import { usePoll } from "@/lib/use-poll";
import { useRefresh } from "@/components/dashboard/refresh-context";
import { tempColor } from "@/lib/format";
import type { TemperatureReport, TemperatureReading } from "@/types/system";

export function TemperaturePanel() {
  const { intervalMs, nonce } = useRefresh();
  const { data, error, loading, refresh } = usePoll<TemperatureReport>(
    "/system/temperature/",
    intervalMs,
    false,
    nonce,
  );
  const temps = data?.temperatures ?? [];
  const hottest = temps.reduce<number | null>(
    (max, t) => (t.current != null && (max == null || t.current > max) ? t.current : max),
    null,
  );

  return (
    <Panel
      eyebrow="thermal"
      title="Temperature"
      summary={
        data ? `${temps.length} sensors${data.fans.length ? ` · ${data.fans.length} fans` : ""}` : "Loading…"
      }
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
        <RecordTable
          getRowId={(r: TemperatureReading & { _i: number }) => String(r._i)}
          rows={temps.map((t, i) => ({ ...t, _i: i }))}
          minWidth={520}
          columns={[
            { key: "chip", header: "Sensor", render: (r) => <span className="font-medium">{r.chip}</span> },
            { key: "label", header: "Label", render: (r) => <Mono>{r.label ?? "—"}</Mono> },
            {
              key: "current",
              header: "Current",
              align: "right",
              render: (r) => (
                <span className="tabular-nums font-semibold" style={{ color: tempColor(r.current) }}>
                  {r.current != null ? `${r.current.toFixed(1)}°C` : "—"}
                </span>
              ),
            },
            { key: "high", header: "High", align: "right", render: (r) => <Mono>{r.high != null ? `${r.high.toFixed(0)}°` : "—"}</Mono> },
            { key: "critical", header: "Critical", align: "right", render: (r) => <Mono>{r.critical != null ? `${r.critical.toFixed(0)}°` : "—"}</Mono> },
          ]}
        />
      )}
    </Panel>
  );
}
