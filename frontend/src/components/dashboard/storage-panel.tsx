"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Folder, FileText, CornerDownRight } from "lucide-react";
import { Panel, Mono, EmptyRow } from "@/components/dashboard/panel";
import { useRefresh } from "@/components/dashboard/refresh-context";
import { RecordTable } from "@/components/ui/record-table";
import { Button } from "@/components/ui/button";
import { apiGet, ApiError } from "@/lib/api";
import { humanBytes, pct, usageColor } from "@/lib/format";
import type { StorageTree, StorageNode } from "@/types/system";

type Flat = { node: StorageNode; depth: number; share: number; id: string };

function flatten(node: StorageNode, rootSize: number, depth = 0, prefix = ""): Flat[] {
  const out: Flat[] = [];
  for (const child of node.children ?? []) {
    const id = `${prefix}/${child.name}`;
    out.push({ node: child, depth, share: rootSize > 0 ? (child.size_bytes / rootSize) * 100 : 0, id });
    if (child.children?.length) out.push(...flatten(child, rootSize, depth + 1, id));
  }
  return out;
}

export function StoragePanel({ defaultPath }: { defaultPath?: string }) {
  const [path, setPath] = useState(defaultPath ?? "");
  const [input, setInput] = useState(defaultPath ?? "");
  const [depth, setDepth] = useState(2);
  const [data, setData] = useState<StorageTree | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p: string, d: number) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ depth: String(d) });
      if (p) qs.set("path", p);
      const res = await apiGet<StorageTree>(`/system/storage/?${qs.toString()}`);
      setData(res);
      setPath(res.path);
      setInput(res.path);
    } catch (err) {
      setError(err instanceof ApiError ? (err.status === 404 ? "Path not found." : err.message) : "Request failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Manual on purpose: scanning a large tree (e.g. home) can take seconds, so we
  // don't auto-scan on load. The user picks a path and presses Scan.

  // Re-scan current path when the global "refresh all" fires, but only if a scan
  // already happened (don't kick off an expensive scan from a global refresh).
  const { nonce } = useRefresh();
  const stateRef = useRef({ path, depth, scanned: false });
  stateRef.current = { path, depth, scanned: data !== null };
  const firstNonce = useRef(true);
  useEffect(() => {
    if (firstNonce.current) {
      firstNonce.current = false;
      return;
    }
    if (!stateRef.current.scanned) return;
    void load(stateRef.current.path, stateRef.current.depth);
  }, [nonce, load]);

  const rows = data ? flatten(data.tree, data.tree.size_bytes) : [];

  return (
    <Panel
      eyebrow="disk usage"
      title="Storage Explorer"
      summary={data ? `${data.tree.path} · ${data.tree.size_human}` : "Loading…"}
      live={false}
      error={error}
      loading={loading}
      onRefresh={() => load(path, depth)}
      actions={
        data?.disk ? (
          <span className="hidden tabular-nums text-[12px] text-[var(--ds-gray-900)] sm:inline">
            {humanBytes(data.disk.free)} free / {humanBytes(data.disk.total)}
          </span>
        ) : null
      }
    >
      <form
        className="flex flex-wrap items-center gap-2 border-b border-[var(--ds-gray-alpha-400)] px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          void load(input, depth);
        }}
      >
        <input
          className="h-8 min-w-0 flex-1 rounded-[7px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-2.5 font-mono text-[12px] text-[var(--ds-gray-1000)] outline-none focus-visible:shadow-[var(--ds-focus-ring)]"
          value={input}
          placeholder="/home/sezer"
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
        />
        <select
          className="h-8 rounded-[7px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-2 text-[12px] text-[var(--ds-gray-1000)] outline-none"
          value={depth}
          onChange={(e) => setDepth(Number(e.target.value))}
        >
          {[1, 2, 3, 4].map((d) => (
            <option key={d} value={d}>
              depth {d}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary" disabled={loading}>
          Scan
        </Button>
      </form>

      {rows.length === 0 && !loading ? (
        <EmptyRow>
          {error
            ? "Nothing to show."
            : data === null
              ? "Enter a path (blank = home) and press Scan to inspect disk usage."
              : "Empty directory."}
        </EmptyRow>
      ) : (
        <RecordTable
          getRowId={(r: Flat) => r.id}
          rows={rows}
          minWidth={620}
          columns={[
            {
              key: "name",
              header: "Path",
              render: (r) => (
                <span className="flex items-center gap-1.5" style={{ paddingLeft: r.depth * 18 }}>
                  {r.depth > 0 ? (
                    <CornerDownRight className="h-3.5 w-3.5 text-[var(--ds-gray-600)]" aria-hidden />
                  ) : null}
                  {r.node.type === "dir" ? (
                    <Folder className="h-3.5 w-3.5 text-[var(--ds-blue-700)]" aria-hidden />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-[var(--ds-gray-600)]" aria-hidden />
                  )}
                  <span className={r.node.type === "dir" ? "font-medium text-[var(--ds-gray-1000)]" : "text-[var(--ds-gray-900)]"}>
                    {r.node.name}
                  </span>
                </span>
              ),
            },
            {
              key: "share",
              header: "Share",
              render: (r) => (
                <span className="inline-flex w-[160px] items-center gap-2">
                  <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--ds-background-200)]">
                    <span className="block h-full rounded-full" style={{ width: `${Math.max(2, r.share)}%`, background: usageColor(r.share) }} />
                  </span>
                  <Mono className="w-10 text-right">{pct(r.share, 0)}</Mono>
                </span>
              ),
            },
            { key: "size", header: "Size", align: "right", render: (r) => <Mono className="text-[var(--ds-gray-1000)]">{r.node.size_human}</Mono> },
          ]}
        />
      )}
    </Panel>
  );
}
