"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Plus, RotateCw, TerminalSquare, Trash2 } from "lucide-react";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecordTable } from "@/components/ui/record-table";
import { Mono, EmptyRow } from "@/components/dashboard/panel";
import { usePoll } from "@/lib/use-poll";
import { ApiError, apiDelete, apiPost } from "@/lib/api";
import { cn } from "@/lib/cn";

type Session = { name: string; windows: number; created: number | null; attached: boolean };
type Sessions = { sessions: Session[] };

const LAYOUTS = [1, 2, 4] as const;
const LS_LAYOUT = "pcterm.layout";
const LS_PANES = "pcterm.panes";

export default function TerminalPage() {
  const [base, setBase] = useState<string | null>(null);
  const [layout, setLayout] = useState<number>(1);
  const [panes, setPanes] = useState<string[]>(["pc"]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, refresh, loading } = usePoll<Sessions>("/terminal/sessions/", 5000);
  const sessions = useMemo(() => data?.sessions ?? [], [data]);

  useEffect(() => {
    const port = process.env.NEXT_PUBLIC_PC_TERMINAL_PORT ?? "7681";
    setBase(`${window.location.protocol}//${window.location.hostname}:${port}`);
    const l = Number(localStorage.getItem(LS_LAYOUT));
    if (LAYOUTS.includes(l as (typeof LAYOUTS)[number])) setLayout(l);
    try {
      const p = JSON.parse(localStorage.getItem(LS_PANES) || "[]");
      if (Array.isArray(p) && p.length) setPanes(p);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_LAYOUT, String(layout));
  }, [layout]);
  useEffect(() => {
    localStorage.setItem(LS_PANES, JSON.stringify(panes));
  }, [panes]);

  // Pane→session list, padded to the chosen layout.
  const visible = useMemo(() => {
    const arr = [...panes];
    while (arr.length < layout) {
      arr.push(sessions[arr.length]?.name ?? arr[0] ?? "pc");
    }
    return arr.slice(0, layout);
  }, [panes, layout, sessions]);

  const setPane = useCallback((i: number, name: string) => {
    setPanes((prev) => {
      const a = [...prev];
      while (a.length <= i) a.push("pc");
      a[i] = name;
      return a;
    });
  }, []);

  const options = useMemo(() => {
    const names = new Set<string>(["pc", ...sessions.map((s) => s.name), ...visible]);
    return Array.from(names).sort();
  }, [sessions, visible]);

  async function createSession(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = newName.trim();
    if (!name) return;
    try {
      await apiPost("/terminal/sessions/", { name });
      setNewName("");
      setPane(0, name);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create session.");
    }
  }

  async function killSession(name: string) {
    setError(null);
    try {
      await apiDelete(`/terminal/sessions/${encodeURIComponent(name)}/`);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not kill session.");
    }
  }

  const cols = layout === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2";
  const paneHeight = layout === 4 ? "38vh" : layout === 2 ? "72vh" : "calc(100vh - 22rem)";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">shell</p>
          <h1 className="flex items-center gap-2 text-[24px] font-semibold leading-7 text-[var(--ds-gray-1000)]">
            <TerminalSquare className="h-5 w-5" aria-hidden /> Terminal
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* layout selector */}
          <div className="inline-flex rounded-[8px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-200)] p-0.5">
            {LAYOUTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLayout(n)}
                className={cn(
                  "h-7 rounded-[6px] px-2.5 text-[12px] font-medium tabular-nums transition",
                  layout === n
                    ? "bg-[var(--ds-background-100)] text-[var(--ds-gray-1000)] shadow-[0_1px_1px_rgb(0_0_0_/_0.06),inset_0_0_0_1px_var(--ds-gray-alpha-400)]"
                    : "text-[var(--ds-gray-700)] hover:text-[var(--ds-gray-1000)]",
                )}
              >
                {n} {n === 1 ? "pane" : "panes"}
              </button>
            ))}
          </div>
          <form onSubmit={createSession} className="flex items-center gap-1.5">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="new session"
              className="h-8 w-32 rounded-[7px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-2.5 font-mono text-[12px] outline-none focus-visible:shadow-[var(--ds-focus-ring)]"
            />
            <Button type="submit" size="sm" variant="secondary" icon={Plus}>
              New
            </Button>
          </form>
        </div>
      </div>

      {error ? <p className="text-[12px] text-[var(--ds-red-900)]">{error}</p> : null}

      {/* Sessions table */}
      <Surface tone="raised" className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--ds-gray-alpha-400)] px-4 py-2.5">
          <p className="font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">
            active sessions ({sessions.length})
          </p>
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh"
            className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] text-[var(--ds-gray-900)] transition hover:bg-[var(--ds-gray-100)]"
          >
            <RotateCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden />
          </button>
        </div>
        {sessions.length === 0 ? (
          <EmptyRow>No sessions yet — create one, or a pane will create “pc” on first view.</EmptyRow>
        ) : (
          <RecordTable
            getRowId={(s: Session) => s.name}
            rows={sessions}
            minWidth={520}
            onRowClick={(s) => setPane(0, s.name)}
            columns={[
              { key: "name", header: "Session", render: (s) => <span className="font-medium">{s.name}</span> },
              { key: "windows", header: "Windows", align: "right", render: (s) => <Mono>{s.windows}</Mono> },
              {
                key: "attached",
                header: "Status",
                render: (s) => (
                  <Badge tone={s.attached ? "green" : "gray"}>{s.attached ? "attached" : "idle"}</Badge>
                ),
              },
              {
                key: "created",
                header: "Created",
                align: "right",
                render: (s) => <Mono>{s.created ? new Date(s.created * 1000).toLocaleString() : "—"}</Mono>,
              },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (s) => (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void killSession(s.name);
                    }}
                    className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-2 text-[12px] font-medium text-[var(--ds-red-900)] transition hover:bg-[var(--ds-gray-100)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden /> Kill
                  </button>
                ),
              },
            ]}
          />
        )}
      </Surface>

      {/* Pane grid */}
      <div className={cn("grid gap-4", cols)}>
        {visible.map((session, i) => (
          <Surface key={i} tone="raised" className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[var(--ds-gray-alpha-400)] px-2 py-1.5">
              <span className="font-mono text-[10px] uppercase tracking-normal text-[var(--ds-gray-600)]">
                pane {i + 1}
              </span>
              <select
                value={session}
                onChange={(e) => setPane(i, e.target.value)}
                className="h-7 rounded-[6px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-2 font-mono text-[12px] text-[var(--ds-gray-1000)] outline-none"
              >
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <div className="flex-1" />
              {base ? (
                <a
                  href={`${base}/?arg=${encodeURIComponent(session)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] text-[var(--ds-gray-900)] transition hover:bg-[var(--ds-gray-100)]"
                  title="Open this session in a new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              ) : null}
            </div>
            {base ? (
              <iframe
                key={`${i}:${session}`}
                src={`${base}/?arg=${encodeURIComponent(session)}`}
                title={`Terminal ${session}`}
                className="w-full border-0 bg-black"
                style={{ height: paneHeight }}
              />
            ) : (
              <div className="p-6 text-[13px] text-[var(--ds-gray-700)]">Loading…</div>
            )}
          </Surface>
        ))}
      </div>

      <p className="text-[12px] text-[var(--ds-gray-700)]">
        Sessions are persistent (tmux) — they keep running after you close this page. Inside a pane:
        <kbd className="mx-1 rounded-[4px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-200)] px-1 font-mono text-[11px]">Ctrl-b d</kbd>
        detaches (keeps running),
        <kbd className="mx-1 rounded-[4px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-200)] px-1 font-mono text-[11px]">Ctrl-b c</kbd>
        adds a window.
      </p>
    </div>
  );
}
