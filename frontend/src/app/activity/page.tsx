"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCw, ScrollText } from "lucide-react";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { RecordTable } from "@/components/ui/record-table";
import { Mono, EmptyRow } from "@/components/dashboard/panel";
import { ApiError, apiGet } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { AuditEvent } from "@/types/audit";

const FILTERS = [
  { label: "All", value: "" },
  { label: "Commands", value: "command" },
  { label: "Created", value: "session.create" },
  { label: "Killed", value: "session.kill" },
] as const;

function actionTone(a: string): "green" | "red" | "blue" | "gray" {
  if (a === "session.create") return "green";
  if (a === "session.kill") return "red";
  if (a === "command") return "blue";
  return "gray";
}

export default function ActivityPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(async (actionFilter: string, search: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "300" });
      if (actionFilter) params.set("action", actionFilter);
      if (search) params.set("q", search);
      const data = await apiGet<AuditEvent[]>(`/audit/events/?${params.toString()}`);
      setEvents(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load activity.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(action, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">audit</p>
          <h1 className="flex items-center gap-2 text-[24px] font-semibold leading-7 text-[var(--ds-gray-1000)]">
            <ScrollText className="h-5 w-5" aria-hidden /> Activity Log
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ds-gray-900)]">
            Who started/killed terminals and the commands they ran — recorded in the background.
          </p>
        </div>
      </div>

      <Surface tone="raised" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--ds-gray-alpha-400)] px-3 py-2.5">
          <div className="inline-flex rounded-[8px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-200)] p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setAction(f.value)}
                className={cn(
                  "h-7 rounded-[6px] px-2.5 text-[12px] font-medium transition",
                  action === f.value
                    ? "bg-[var(--ds-background-100)] text-[var(--ds-gray-1000)] shadow-[0_1px_1px_rgb(0_0_0_/_0.06),inset_0_0_0_1px_var(--ds-gray-alpha-400)]"
                    : "text-[var(--ds-gray-700)] hover:text-[var(--ds-gray-1000)]",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void load(action, q);
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="search command / path…"
              className="h-8 min-w-0 flex-1 rounded-[7px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-2.5 font-mono text-[12px] outline-none focus-visible:shadow-[var(--ds-focus-ring)]"
            />
          </form>
          <button
            type="button"
            onClick={() => load(action, q)}
            aria-label="Refresh"
            className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] text-[var(--ds-gray-900)] transition hover:bg-[var(--ds-gray-100)]"
          >
            <RotateCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden />
          </button>
        </div>

        {error ? (
          <div className="px-4 py-2 text-[12px] text-[var(--ds-red-900)]">{error}</div>
        ) : null}

        {events.length === 0 && !loading ? (
          <EmptyRow>No activity recorded yet.</EmptyRow>
        ) : (
          <RecordTable
            getRowId={(e: AuditEvent) => String(e.id)}
            rows={events}
            minWidth={820}
            columns={[
              {
                key: "time",
                header: "Time",
                render: (e) => <Mono>{new Date(e.created_at).toLocaleString()}</Mono>,
              },
              { key: "actor", header: "Actor", render: (e) => <span className="font-medium">{e.actor}</span> },
              {
                key: "action",
                header: "Action",
                render: (e) => (
                  <Badge tone={actionTone(e.action)}>{e.action.replace("session.", "")}</Badge>
                ),
              },
              { key: "target", header: "Session", render: (e) => <Mono>{e.target || "—"}</Mono> },
              {
                key: "detail",
                header: "Detail",
                render: (e) => (
                  <Mono className="block max-w-[420px] truncate text-[var(--ds-gray-900)]">
                    {e.detail || "—"}
                  </Mono>
                ),
              },
              { key: "ip", header: "IP", align: "right", render: (e) => <Mono>{e.source_ip ?? "—"}</Mono> },
            ]}
          />
        )}
      </Surface>
    </div>
  );
}
