"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, TerminalSquare } from "lucide-react";
import { Panel, Mono, EmptyRow } from "@/components/dashboard/panel";
import { RecordTable } from "@/components/ui/record-table";
import { Badge } from "@/components/ui/badge";
import { StatusSignal } from "@/components/ui/status-signal";
import { useRefresh } from "@/components/dashboard/refresh-context";
import { usePoll } from "@/lib/use-poll";
import { ago } from "@/lib/format";
import type { TerminalSessions, TerminalSession } from "@/types/terminal";

function shortenPath(path: string | null): string {
  if (!path) return "—";
  return path.replace(/^\/home\/[^/]+/, "~").replace(/^\/root/, "~");
}

function cmdTone(cmd: string | null): "blue" | "purple" | "amber" | "teal" | "gray" | "green" {
  const c = (cmd || "").toLowerCase();
  if (["python", "python3", "claude", "node", "npm", "pnpm", "ipython"].includes(c)) return "blue";
  if (["vim", "nvim", "nano", "emacs", "vi"].includes(c)) return "purple";
  if (["git"].includes(c)) return "amber";
  if (["ssh", "tmux", "docker", "kubectl"].includes(c)) return "teal";
  return "gray";
}

export function ActiveTerminals() {
  const router = useRouter();
  const { intervalMs, nonce } = useRefresh();
  const { data, error, loading, refresh } = usePoll<TerminalSessions>(
    "/terminal/sessions/",
    intervalMs,
    false,
    nonce,
  );
  const sessions = data?.sessions ?? [];

  return (
    <Panel
      eyebrow="shell"
      title="Active Terminals"
      summary={data ? `${sessions.length} tmux session${sessions.length === 1 ? "" : "s"}` : "Loading…"}
      live
      error={error}
      loading={loading}
      onRefresh={refresh}
      actions={
        <Link
          href="/terminal"
          className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-2 text-[12px] font-medium text-[var(--ds-gray-1000)] transition hover:bg-[var(--ds-gray-100)]"
        >
          <TerminalSquare className="h-3.5 w-3.5" aria-hidden /> Open
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      }
    >
      {sessions.length === 0 ? (
        <EmptyRow>No terminal sessions running.</EmptyRow>
      ) : (
        <RecordTable
          getRowId={(s: TerminalSession) => s.name}
          rows={sessions}
          minWidth={720}
          onRowClick={(s) => router.push(`/terminal?focus=${encodeURIComponent(s.name)}`)}
          columns={[
            {
              key: "name",
              header: "Session",
              render: (s) => (
                <StatusSignal
                  color={s.attached ? "var(--ds-green-700)" : "var(--ds-gray-500)"}
                  pulse={s.attached}
                  variant="cell"
                >
                  <span className="font-medium">{s.name}</span>
                </StatusSignal>
              ),
            },
            {
              key: "command",
              header: "Running",
              render: (s) => <Badge tone={cmdTone(s.command)}>{s.command ?? "—"}</Badge>,
            },
            {
              key: "path",
              header: "Directory",
              render: (s) => (
                <Mono className="block max-w-[260px] truncate text-[var(--ds-gray-900)]">
                  {shortenPath(s.path)}
                </Mono>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (s) => (
                <span className="text-[12px] text-[var(--ds-gray-900)]">
                  {s.attached ? "attached" : "idle"}
                </span>
              ),
            },
            { key: "windows", header: "Win", align: "right", render: (s) => <Mono>{s.windows}</Mono> },
            {
              key: "activity",
              header: "Last active",
              align: "right",
              render: (s) => <Mono>{ago(s.activity)}</Mono>,
            },
          ]}
        />
      )}
    </Panel>
  );
}
