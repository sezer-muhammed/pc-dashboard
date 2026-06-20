"use client";

import type { ReactNode } from "react";
import { Panel, Mono } from "@/components/dashboard/panel";
import { usePoll } from "@/lib/use-poll";
import { useRefresh } from "@/components/dashboard/refresh-context";
import { humanBytes, pct, usageColor } from "@/lib/format";
import type { Memory, MemBlock } from "@/types/system";

type Seg = { label: string; value: number; color: string };

// A single stacked snapshot bar showing how the pool is composed right now.
function StackBar({ segments, total }: { segments: Seg[]; total: number }) {
  if (!total) return null;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full border border-[var(--ds-gray-alpha-300)] bg-[var(--ds-background-200)]">
      {segments.map((s) =>
        s.value > 0 ? (
          <span key={s.label} title={`${s.label} · ${humanBytes(s.value)}`} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
        ) : null,
      )}
    </div>
  );
}

function Tile({ label, value, swatch }: { label: string; value: ReactNode; swatch?: string }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-normal text-[var(--ds-gray-700)]">
        {swatch ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: swatch }} /> : null}
        {label}
      </p>
      <p className="mt-0.5 truncate text-[13px] font-semibold tabular-nums text-[var(--ds-gray-1000)]">{value}</p>
    </div>
  );
}

const USED = "var(--ds-blue-700)";
const CACHED = "var(--ds-gray-600)";
const BUFFERS = "var(--ds-gray-400)";
const FREE = "var(--ds-gray-200)";

function tile(label: string, v: number | null | undefined, swatch?: string) {
  return v != null ? <Tile key={label} label={label} value={humanBytes(v)} swatch={swatch} /> : null;
}

function RamSection({ block }: { block: MemBlock }) {
  const buffers = block.buffers ?? 0;
  const cached = block.cached ?? 0;
  const used = block.used;
  const free = Math.max(0, block.total - used - buffers - cached);
  const segments: Seg[] = [
    { label: "Used", value: used, color: USED },
    { label: "Buffers", value: buffers, color: BUFFERS },
    { label: "Cached", value: cached, color: CACHED },
    { label: "Free", value: free, color: FREE },
  ];
  return (
    <div className="px-4 py-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-[var(--ds-gray-1000)]">RAM</span>
        <Mono className="text-[var(--ds-gray-1000)]">
          {humanBytes(used)} / {humanBytes(block.total)} · <span style={{ color: usageColor(block.percent) }}>{pct(block.percent, 0)}</span>
        </Mono>
      </div>
      <StackBar segments={segments} total={block.total} />
      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
        {tile("Available", block.available)}
        {tile("Used", used, USED)}
        {tile("Free", free, FREE)}
        {tile("Cached", block.cached, CACHED)}
        {tile("Buffers", block.buffers, BUFFERS)}
        {tile("Shared", block.shared)}
        {tile("Active", block.active)}
        {tile("Inactive", block.inactive)}
      </div>
    </div>
  );
}

function SwapSection({ block }: { block: MemBlock }) {
  return (
    <div className="border-t border-[var(--ds-gray-alpha-300)] px-4 py-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-[var(--ds-gray-1000)]">Swap</span>
        {block.total ? (
          <Mono className="text-[var(--ds-gray-1000)]">
            {humanBytes(block.used)} / {humanBytes(block.total)} · <span style={{ color: usageColor(block.percent) }}>{pct(block.percent, 0)}</span>
          </Mono>
        ) : (
          <Mono>not configured</Mono>
        )}
      </div>
      {block.total ? (
        <>
          <StackBar
            segments={[
              { label: "Used", value: block.used, color: USED },
              { label: "Free", value: Math.max(0, block.total - block.used), color: FREE },
            ]}
            total={block.total}
          />
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
            {tile("Free", block.free, FREE)}
            {tile("Swapped In", block.sin)}
            {tile("Swapped Out", block.sout)}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function MemoryPanel() {
  const { intervalMs, nonce } = useRefresh();
  const { data, error, loading, refresh } = usePoll<Memory>(
    "/system/memory/",
    intervalMs,
    false,
    nonce,
  );

  return (
    <Panel
      eyebrow="memory"
      title="Memory"
      summary={data ? `${humanBytes(data.virtual.used)} of ${humanBytes(data.virtual.total)} used` : "Loading…"}
      error={error}
      loading={loading}
      onRefresh={refresh}
    >
      {data ? (
        <>
          <RamSection block={data.virtual} />
          <SwapSection block={data.swap} />
        </>
      ) : (
        <div className="px-4 py-8 text-center text-[13px] text-[var(--ds-gray-700)]">Loading…</div>
      )}
    </Panel>
  );
}
