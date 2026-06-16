"use client";

// Lightweight API client for sezer-pc-backend. The dashboard calls the Django
// backend directly (CORS is enabled server-side). Auth uses HTTP Basic; the
// base64 credential is kept in localStorage.

const API_BASE = process.env.NEXT_PUBLIC_PC_API ?? "http://127.0.0.1:8000";
const CRED_KEY = "pcdash.cred";

export function getCred(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CRED_KEY);
}

export function setCred(username: string, password: string): string {
  const cred = btoa(`${username}:${password}`);
  window.localStorage.setItem(CRED_KEY, cred);
  return cred;
}

export function clearCred(): void {
  window.localStorage.removeItem(CRED_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const cred = getCred();
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    headers: cred ? { Authorization: `Basic ${cred}` } : {},
    signal,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ApiError(res.status, `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

// Verify a credential against an auth-required endpoint. Returns true on 200,
// false on 401/403 (bad creds). Throws on network/CORS failure so the caller
// can distinguish "wrong password" from "backend unreachable".
export async function verifyCred(username: string, password: string): Promise<boolean> {
  const cred = btoa(`${username}:${password}`);
  const res = await fetch(`${API_BASE}/api/v1/system/status/`, {
    headers: { Authorization: `Basic ${cred}` },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) return false;
  if (!res.ok) throw new Error(`Backend error ${res.status}`);
  return true;
}
