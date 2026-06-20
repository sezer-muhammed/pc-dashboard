"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Cast, Eye, Hand, LogOut, Monitor, MonitorPlay } from "lucide-react";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

type Role = "controller" | "viewer";
type MonitorStatus = {
  state: "empty" | "occupied";
  controller: { name: string } | null;
  viewers: number;
  ttlMs: number;
};
type ClaimResult = MonitorStatus & { id: string; role: Role; name: string };

const DISPLAY_PORT = process.env.NEXT_PUBLIC_PC_DISPLAY_PORT ?? "8080";
const DISPLAY_PWD = process.env.NEXT_PUBLIC_PC_DISPLAY_PASSWORD ?? "neko";

export default function DisplayPage() {
  const [base, setBase] = useState<string | null>(null);
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [session, setSession] = useState<ClaimResult | null>(null);
  const [name, setName] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBase(`${window.location.protocol}//${window.location.hostname}:${DISPLAY_PORT}`);
    setName(localStorage.getItem("pcdisplay.name") || "");
  }, []);

  // Poll monitor status while we're in the lobby.
  useEffect(() => {
    if (session) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch("/api/display", { cache: "no-store" });
        const s = (await r.json()) as MonitorStatus;
        if (!stop) setStatus(s);
      } catch {
        /* keep last known */
      }
    };
    tick();
    const t = setInterval(tick, 2500);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [session]);

  const nekoUrl = useCallback(
    (role: Role, who: string) => {
      const p = new URLSearchParams({ usr: who, pwd: DISPLAY_PWD, embed: "1" });
      if (role === "viewer") p.set("cast", "1");
      return `${base}/?${p.toString()}`;
    },
    [base],
  );

  async function enter() {
    const who = name.trim();
    if (!who) return;
    setConnecting(true);
    setError(null);
    try {
      const r = await fetch("/api/display/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: who }),
      });
      const res = (await r.json()) as ClaimResult;
      localStorage.setItem("pcdisplay.name", who);
      setSession(res);
    } catch {
      setError("Could not reach the lock service.");
    } finally {
      setConnecting(false);
    }
  }

  if (session && base) {
    return <DisplaySession initial={session} url={nekoUrl} onExit={() => setSession(null)} />;
  }

  return <DisplayLobby status={status} name={name} setName={setName} connecting={connecting} error={error} onEnter={enter} ready={!!base} />;
}

/* ───────────────────────────── Lobby ───────────────────────────── */

function DisplayLobby({
  status,
  name,
  setName,
  connecting,
  error,
  onEnter,
  ready,
}: {
  status: MonitorStatus | null;
  name: string;
  setName: (v: string) => void;
  connecting: boolean;
  error: string | null;
  onEnter: () => void;
  ready: boolean;
}) {
  const occupied = status?.state === "occupied";
  const known = !!status;
  const canSubmit = ready && known && !connecting && name.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">remote</p>
          <h1 className="flex items-center gap-2 text-[24px] font-semibold leading-7 text-[var(--ds-gray-1000)]">
            <Monitor className="h-5 w-5" aria-hidden /> Display
          </h1>
        </div>
        {known ? (
          occupied ? (
            <Badge tone="red">● In use</Badge>
          ) : (
            <Badge tone="green">Available</Badge>
          )
        ) : (
          <Badge tone="gray">connecting…</Badge>
        )}
      </div>

      <Surface tone="raised" className="overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
          {/* screen preview */}
          <div
            className={cn(
              "relative flex aspect-video items-center justify-center border-b md:border-b-0 md:border-r border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-200)]",
            )}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.5]"
              style={{ backgroundImage: "repeating-linear-gradient(0deg,#0000000a 0 1px,transparent 1px 3px)" }}
            />
            <div className="z-10 flex flex-col items-center gap-2 px-6 text-center">
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full border",
                  occupied
                    ? "border-[var(--ds-red-400)] text-[var(--ds-red-900)]"
                    : "border-[var(--ds-green-400)] text-[var(--ds-green-900)]",
                )}
              >
                {occupied ? <Eye className="h-5 w-5" /> : <MonitorPlay className="h-5 w-5" />}
              </span>
              <p className="text-[14px] font-medium text-[var(--ds-gray-1000)]">
                {!known
                  ? "Connecting…"
                  : occupied
                    ? `${status?.controller?.name ?? "Someone"} is in control`
                    : "The monitor is free"}
              </p>
              <p className="text-[12px] text-[var(--ds-gray-700)]">
                {occupied ? "Join as a viewer — take over when it frees up." : "Connect to take control."}
              </p>
            </div>
          </div>

          {/* connect panel */}
          <div className="flex flex-col gap-4 p-5">
            <dl className="grid grid-cols-2 gap-3">
              <Meta label="Resolution" value="1920 × 1080" />
              <Meta label="Frame rate" value="60 fps" />
              <Meta label="Encode" value="NVENC H.264" />
              <Meta label="Viewers" value={known ? String(status!.viewers) : "—"} />
            </dl>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">
                your name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canSubmit && onEnter()}
                placeholder="e.g. admin"
                maxLength={32}
                className="h-9 rounded-[7px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-3 text-[13px] outline-none focus-visible:shadow-[var(--ds-focus-ring)]"
              />
            </div>

            <Button
              variant={occupied ? "secondary" : "primary"}
              icon={occupied ? Eye : Hand}
              disabled={!canSubmit}
              onClick={onEnter}
            >
              {connecting ? "Connecting…" : occupied ? "Watch live" : "Take control"}
            </Button>

            {error ? <p className="text-[12px] text-[var(--ds-red-900)]">{error}</p> : null}
          </div>
        </div>
      </Surface>

      <p className="text-[12px] leading-5 text-[var(--ds-gray-700)]">
        One GPU-rendered desktop is streamed over WebRTC. The first person to connect drives it; others watch and
        can take over when it&apos;s released. If the screen stays black, the Display service (Neko, port {DISPLAY_PORT})
        isn&apos;t running yet — see <span className="font-mono">deploy/display</span>.
      </p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[7px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-3 py-2">
      <dt className="font-mono text-[10px] uppercase tracking-normal text-[var(--ds-gray-600)]">{label}</dt>
      <dd className="mt-0.5 text-[13px] font-medium text-[var(--ds-gray-1000)] tabular-nums">{value}</dd>
    </div>
  );
}

/* ───────────────────────────── Session ───────────────────────────── */

function DisplaySession({
  initial,
  url,
  onExit,
}: {
  initial: ClaimResult;
  url: (role: Role, name: string) => string;
  onExit: () => void;
}) {
  const [role, setRole] = useState<Role>(initial.role);
  const [seatOpen, setSeatOpen] = useState(false);
  const [viewers, setViewers] = useState(initial.viewers);
  const idRef = useRef(initial.id);
  const nameRef = useRef(initial.name);

  const isController = role === "controller";
  const src = url(role, nameRef.current);

  useEffect(() => {
    let stop = false;
    const beat = async (upgrade = false) => {
      try {
        const r = await fetch("/api/display/heartbeat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: idRef.current, upgrade }),
        });
        if (r.status === 410) {
          if (!stop) onExit();
          return;
        }
        const data = (await r.json()) as ClaimResult;
        if (stop) return;
        setViewers(data.viewers);
        setSeatOpen(data.role === "viewer" && data.state === "empty");
        if (data.role === "controller") setRole("controller");
      } catch {
        /* transient */
      }
    };
    beat();
    const t = setInterval(() => beat(), 4000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [onExit]);

  useEffect(() => {
    const bye = () =>
      navigator.sendBeacon?.(
        "/api/display/release",
        new Blob([JSON.stringify({ id: idRef.current })], { type: "application/json" }),
      );
    window.addEventListener("pagehide", bye);
    return () => window.removeEventListener("pagehide", bye);
  }, []);

  async function leave() {
    try {
      await fetch("/api/display/release", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: idRef.current }),
      });
    } catch {
      /* ignore */
    }
    onExit();
  }

  async function takeControl() {
    try {
      const r = await fetch("/api/display/heartbeat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: idRef.current, upgrade: true }),
      });
      const data = (await r.json()) as ClaimResult;
      if (data.role === "controller") {
        setRole("controller");
        setSeatOpen(false);
      }
    } catch {
      /* next heartbeat reconciles */
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={LogOut} onClick={leave}>
            Leave
          </Button>
          <span aria-hidden className="h-5 w-px bg-[var(--ds-gray-alpha-300)]" />
          {isController ? (
            <Badge tone="green">
              <Hand className="mr-1 h-3 w-3" /> You&apos;re in control
            </Badge>
          ) : (
            <Badge tone="gray">
              <Cast className="mr-1 h-3 w-3" /> Viewing (read-only)
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ds-gray-700)]">
            <Eye className="h-3.5 w-3.5" /> {viewers} watching
          </span>
          {!isController && seatOpen ? (
            <Button variant="primary" size="sm" icon={Hand} onClick={takeControl}>
              Take control
            </Button>
          ) : null}
        </div>
      </div>

      <Surface tone="raised" className="overflow-hidden">
        <iframe
          key={src}
          src={src}
          title="Virtual monitor"
          allow="autoplay; fullscreen; clipboard-read; clipboard-write; microphone; camera"
          className="w-full border-0 bg-black"
          style={{ height: "calc(100vh - 12rem)" }}
        />
      </Surface>
    </div>
  );
}
