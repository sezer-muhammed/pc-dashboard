"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Lock, LogOut } from "lucide-react";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { clearCred, getCred, setCred, verifyCred } from "@/lib/api";
import { siteConfig } from "@/config/site";

const AuthContext = createContext<{ signOut: () => void }>({ signOut: () => {} });
export const useAuth = () => useContext(AuthContext);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("sezer");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAuthed(Boolean(getCred()));
    setReady(true);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const ok = await verifyCred(username, password);
      if (!ok) {
        setError("Invalid credentials.");
        return;
      }
      setCred(username, password);
      setAuthed(true);
    } catch {
      setError("Could not reach the API. Is the backend running on :8000?");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    clearCred();
    setAuthed(false);
    setPassword("");
  }

  if (!ready) return null;

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Surface tone="raised" className="w-full max-w-sm p-6">
          <div className="mb-5 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-200)]">
              <Lock className="h-4 w-4 text-[var(--ds-gray-900)]" aria-hidden />
            </span>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">
                {siteConfig.shortName} · sign in
              </p>
              <h1 className="text-[16px] font-semibold text-[var(--ds-gray-1000)]">
                {siteConfig.name}
              </h1>
            </div>
          </div>
          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            <Field label="Username">
              <input
                className="h-9 w-full rounded-[7px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-3 text-[13px] text-[var(--ds-gray-1000)] outline-none focus-visible:shadow-[var(--ds-focus-ring)]"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                className="h-9 w-full rounded-[7px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-3 text-[13px] text-[var(--ds-gray-1000)] outline-none focus-visible:shadow-[var(--ds-focus-ring)]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            {error ? (
              <p className="text-[12px] text-[var(--ds-red-900)]">{error}</p>
            ) : null}
            <Button type="submit" variant="primary" disabled={busy} className="mt-1 w-full">
              {busy ? "Checking…" : "Sign in"}
            </Button>
          </form>
        </Surface>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ signOut }}>{children}</AuthContext.Provider>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <Button variant="ghost" size="sm" icon={LogOut} onClick={signOut}>
      Sign out
    </Button>
  );
}
