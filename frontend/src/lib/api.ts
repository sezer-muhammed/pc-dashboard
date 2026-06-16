"use client";

// Lightweight API client for sezer-pc-backend. The dashboard calls the Django
// backend directly (CORS is enabled server-side). Auth uses HTTP Basic; the
// base64 credential is kept in localStorage.

// API base: explicit override wins; otherwise call the backend on the SAME host
// the dashboard is served from (so it works over localhost, LAN, or Tailscale),
// on port 8000. Falls back to 127.0.0.1 during SSR (no window).
import { setCached } from "@/lib/cache";

const API_PORT = process.env.NEXT_PUBLIC_PC_API_PORT ?? "8000";
const API_BASE =
  process.env.NEXT_PUBLIC_PC_API ??
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:${API_PORT}`
    : "http://127.0.0.1:8000");
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
  const data = (await res.json()) as T;
  setCached(path, data);
  return data;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const j = await res.json();
    if (typeof j === "string") return j;
    if (j?.detail) return String(j.detail);
    const first = j && typeof j === "object" ? Object.values(j)[0] : null;
    if (Array.isArray(first)) return String(first[0]);
    return `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const cred = getCred();
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cred ? { Authorization: `Basic ${cred}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export async function apiDelete(path: string): Promise<void> {
  const cred = getCred();
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method: "DELETE",
    headers: cred ? { Authorization: `Basic ${cred}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
}

export async function uploadFiles(targetPath: string, files: File[]): Promise<void> {
  const cred = getCred();
  const form = new FormData();
  form.append("path", targetPath);
  for (const f of files) form.append("file", f);
  const res = await fetch(`${API_BASE}/api/v1/files/upload/`, {
    method: "POST",
    headers: cred ? { Authorization: `Basic ${cred}` } : {},
    body: form, // browser sets multipart Content-Type + boundary
  });
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText}`);
}

export async function downloadFile(path: string, filename: string): Promise<void> {
  const cred = getCred();
  const res = await fetch(
    `${API_BASE}/api/v1/files/download/?path=${encodeURIComponent(path)}`,
    { headers: cred ? { Authorization: `Basic ${cred}` } : {} },
  );
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
