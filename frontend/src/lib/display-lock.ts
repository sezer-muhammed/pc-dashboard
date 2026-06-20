// Single shared "virtual monitor" lock, kept in-process.
//
// The Display tab streams ONE GPU desktop (Neko) over WebRTC. Only one person may
// drive it at a time; everyone else watches. This module owns that one piece of
// state: who currently holds control. State lives on globalThis so it survives
// Next's module re-evaluation (and HMR in dev).

import { randomUUID } from "node:crypto";

export type Role = "controller" | "viewer";

type Session = { name: string; role: Role; lastSeen: number };
type Store = { sessions: Map<string, Session>; controllerId: string | null };

const TTL = Number(process.env.PC_DISPLAY_TTL_MS ?? 12000);

const g = globalThis as unknown as { __pcDisplayLock?: Store };
const store: Store = (g.__pcDisplayLock ??= { sessions: new Map(), controllerId: null });

const now = () => Date.now();
const alive = (s: Session | undefined) => !!s && now() - s.lastSeen < TTL;

function sweep() {
  for (const [id, s] of store.sessions) {
    if (!alive(s)) {
      store.sessions.delete(id);
      if (id === store.controllerId) store.controllerId = null;
    }
  }
  if (store.controllerId && !store.sessions.has(store.controllerId)) store.controllerId = null;
}

export interface MonitorStatus {
  state: "empty" | "occupied";
  controller: { name: string } | null;
  viewers: number;
  ttlMs: number;
}

export function status(): MonitorStatus {
  sweep();
  const ctrl = store.controllerId ? store.sessions.get(store.controllerId) : null;
  let viewers = 0;
  for (const s of store.sessions.values()) if (s.role === "viewer") viewers++;
  return {
    state: ctrl ? "occupied" : "empty",
    controller: ctrl ? { name: ctrl.name } : null,
    viewers,
    ttlMs: TTL,
  };
}

function cleanName(raw: unknown): string {
  return (String(raw ?? "guest").slice(0, 32).replace(/[^\w .-]/g, "") || "guest");
}

export function claim(rawName: unknown) {
  sweep();
  const name = cleanName(rawName);
  const id = randomUUID();
  let role: Role;
  if (!store.controllerId) {
    store.controllerId = id;
    role = "controller";
  } else {
    role = "viewer";
  }
  store.sessions.set(id, { name, role, lastSeen: now() });
  return { id, role, name, ...status() };
}

export function heartbeat(id: unknown, upgrade = false) {
  const sid = String(id ?? "");
  const s = store.sessions.get(sid);
  if (!s) return null; // expired → caller returns 410
  s.lastSeen = now();
  sweep();
  if (upgrade && s.role === "viewer" && !store.controllerId) {
    store.controllerId = sid;
    s.role = "controller";
  }
  return { id: sid, role: s.role, name: s.name, ...status() };
}

export function release(id: unknown) {
  const sid = String(id ?? "");
  if (store.sessions.has(sid)) {
    store.sessions.delete(sid);
    if (sid === store.controllerId) store.controllerId = null;
  }
  return status();
}
