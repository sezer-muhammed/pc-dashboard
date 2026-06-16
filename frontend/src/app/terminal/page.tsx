"use client";

import { useEffect, useState } from "react";
import { ExternalLink, TerminalSquare } from "lucide-react";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";

// ttyd (web terminal) runs as its own service on the host. It attaches the
// browser to a persistent tmux session, so terminals survive closing the tab.
export default function TerminalPage() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const port = process.env.NEXT_PUBLIC_PC_TERMINAL_PORT ?? "7681";
    setUrl(`${window.location.protocol}//${window.location.hostname}:${port}/`);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">
            shell
          </p>
          <h1 className="flex items-center gap-2 text-[24px] font-semibold leading-7 text-[var(--ds-gray-1000)]">
            <TerminalSquare className="h-5 w-5" aria-hidden /> Terminal
          </h1>
          <p className="mt-1 text-[13px] text-[var(--ds-gray-900)]">
            A live shell on the host, backed by a persistent <span className="font-mono">tmux</span>{" "}
            session — terminals keep running even after you close this page.
          </p>
        </div>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-[7px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-3 text-[13px] font-medium text-[var(--ds-gray-1000)] transition hover:bg-[var(--ds-gray-100)]"
          >
            <ExternalLink className="h-4 w-4" aria-hidden /> Open in new tab
          </a>
        ) : null}
      </div>

      <Surface tone="raised" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--ds-gray-alpha-400)] px-3 py-2">
          <Badge tone="green">tmux: pc</Badge>
          <Hint k="Ctrl-b c">new window</Hint>
          <Hint k="Ctrl-b n / p">switch</Hint>
          <Hint k="Ctrl-b w">list</Hint>
          <Hint k="Ctrl-b d">detach (keeps running)</Hint>
        </div>
        {url ? (
          <iframe
            src={url}
            title="PC Terminal"
            className="h-[calc(100vh-13rem)] w-full border-0 bg-black"
          />
        ) : (
          <div className="p-6 text-[13px] text-[var(--ds-gray-700)]">Loading terminal…</div>
        )}
      </Surface>
    </div>
  );
}

function Hint({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ds-gray-900)]">
      <kbd className="rounded-[5px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-200)] px-1.5 py-0.5 font-mono text-[11px]">
        {k}
      </kbd>
      {children}
    </span>
  );
}
