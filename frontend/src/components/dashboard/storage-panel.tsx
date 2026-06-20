"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Folder,
  Loader2,
} from "lucide-react";
import { Panel, Mono, EmptyRow } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import { useRefresh } from "@/components/dashboard/refresh-context";
import { apiGet, ApiError } from "@/lib/api";
import { humanBytes, pct, usageColor } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { StorageTree, StorageNode } from "@/types/system";

export function StoragePanel({ defaultPath }: { defaultPath?: string }) {
  const [input, setInput] = useState(defaultPath ?? "");
  const [root, setRoot] = useState<StorageNode | null>(null);
  const [disk, setDisk] = useState<StorageTree["disk"]>(null);
  const [childrenMap, setChildrenMap] = useState<Record<string, StorageNode[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchDir = useCallback(async (path: string): Promise<StorageTree> => {
    const qs = new URLSearchParams({ depth: "1" });
    if (path) qs.set("path", path);
    return apiGet<StorageTree>(`/system/storage/?${qs.toString()}`);
  }, []);

  const scan = useCallback(
    async (path: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDir(path);
        setRoot(data.tree);
        setDisk(data.disk);
        setChildrenMap({ [data.tree.path]: data.tree.children ?? [] });
        setExpanded(new Set([data.tree.path]));
        setInput(data.tree.path);
      } catch (e) {
        setError(
          e instanceof ApiError ? (e.status === 404 ? "Path not found." : e.message) : "Scan failed.",
        );
        setRoot(null);
      } finally {
        setLoading(false);
      }
    },
    [fetchDir],
  );

  const toggle = useCallback(
    async (node: StorageNode) => {
      const p = node.path;
      const willExpand = !expanded.has(p);
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(p)) next.delete(p);
        else next.add(p);
        return next;
      });
      if (willExpand && !childrenMap[p]) {
        setLoadingPaths((s) => new Set(s).add(p));
        try {
          const data = await fetchDir(p);
          setChildrenMap((m) => ({ ...m, [p]: data.tree.children ?? [] }));
        } catch {
          /* leave unexpanded-with-no-children; row just shows nothing */
        } finally {
          setLoadingPaths((s) => {
            const n = new Set(s);
            n.delete(p);
            return n;
          });
        }
      }
    },
    [expanded, childrenMap, fetchDir],
  );

  async function copyPath(p: string) {
    try {
      await navigator.clipboard.writeText(p);
      setCopied(p);
      setTimeout(() => setCopied((c) => (c === p ? null : c)), 1200);
    } catch {
      /* clipboard blocked */
    }
  }

  // Re-scan the current root on global "refresh all" (skip mount; manual otherwise).
  const { nonce } = useRefresh();
  const rootRef = useRef<string | null>(null);
  rootRef.current = root?.path ?? null;
  const firstNonce = useRef(true);
  useEffect(() => {
    if (firstNonce.current) {
      firstNonce.current = false;
      return;
    }
    if (rootRef.current) void scan(rootRef.current);
  }, [nonce, scan]);

  function renderChildren(parentPath: string, parentSize: number, depth: number): React.ReactNode {
    const kids = childrenMap[parentPath];
    if (!kids) return null;
    return kids.map((node) => {
      const isDir = node.type === "dir";
      const isExp = expanded.has(node.path);
      const isBusy = loadingPaths.has(node.path);
      const share = parentSize > 0 ? (node.size_bytes / parentSize) * 100 : 0;
      return (
        <div key={node.path}>
          <div
            className={cn(
              "group flex items-center gap-2 border-b border-[var(--ds-gray-alpha-200)] py-1.5 pr-3 text-[13px] transition last:border-b-0",
              isDir && "cursor-pointer hover:bg-[var(--ds-gray-100)]",
            )}
            style={{ paddingLeft: 12 + depth * 16 }}
            onClick={isDir ? () => toggle(node) : undefined}
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--ds-gray-600)]">
              {isDir ? (
                isBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : isExp ? (
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                )
              ) : null}
            </span>
            {isDir ? (
              <Folder className="h-4 w-4 shrink-0 text-[var(--ds-blue-700)]" aria-hidden />
            ) : (
              <FileText className="h-4 w-4 shrink-0 text-[var(--ds-gray-600)]" aria-hidden />
            )}
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                isDir ? "font-medium text-[var(--ds-gray-1000)]" : "text-[var(--ds-gray-900)]",
              )}
            >
              {node.name}
            </span>
            <span className="hidden w-[140px] items-center gap-2 sm:inline-flex">
              <span className="block h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--ds-background-200)]">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${Math.max(2, share)}%`, background: usageColor(share) }}
                />
              </span>
              <Mono className="w-9 text-right text-[11px]">{pct(share, 0)}</Mono>
            </span>
            <Mono className="w-20 text-right text-[var(--ds-gray-1000)]">{node.size_human}</Mono>
            <button
              type="button"
              title="Copy absolute path"
              onClick={(e) => {
                e.stopPropagation();
                void copyPath(node.path);
              }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border border-transparent text-[var(--ds-gray-600)] opacity-0 transition hover:border-[var(--ds-gray-alpha-400)] hover:bg-[var(--ds-background-100)] group-hover:opacity-100"
            >
              {copied === node.path ? (
                <Check className="h-3.5 w-3.5 text-[var(--ds-green-700)]" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
          </div>
          {isDir && isExp ? renderChildren(node.path, node.size_bytes, depth + 1) : null}
        </div>
      );
    });
  }

  return (
    <Panel
      eyebrow="disk usage"
      title="Storage Explorer"
      summary={root ? `${root.path} · ${root.size_human}` : "Pick a path and Scan"}
      live={false}
      error={error}
      loading={loading}
      onRefresh={root ? () => scan(root.path) : undefined}
      actions={
        disk ? (
          <span className="hidden tabular-nums text-[12px] text-[var(--ds-gray-900)] sm:inline">
            {humanBytes(disk.free)} free / {humanBytes(disk.total)}
          </span>
        ) : null
      }
    >
      <form
        className="flex flex-wrap items-center gap-2 border-b border-[var(--ds-gray-alpha-400)] px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          void scan(input);
        }}
      >
        <input
          className="h-8 min-w-0 flex-1 rounded-[7px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-2.5 font-mono text-[12px] text-[var(--ds-gray-1000)] outline-none focus-visible:shadow-[var(--ds-focus-ring)]"
          value={input}
          placeholder="/home/user (blank = home)"
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
        />
        <Button type="submit" size="sm" variant="secondary" disabled={loading}>
          Scan
        </Button>
      </form>

      {root && (childrenMap[root.path]?.length ?? 0) === 0 && !loading ? (
        <EmptyRow>Empty directory.</EmptyRow>
      ) : root ? (
        <div className="max-h-[60vh] overflow-auto">{renderChildren(root.path, root.size_bytes, 0)}</div>
      ) : !loading ? (
        <EmptyRow>Enter a path (blank = home) and press Scan. Click folders to expand.</EmptyRow>
      ) : null}
    </Panel>
  );
}
