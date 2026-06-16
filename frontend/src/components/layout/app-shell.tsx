"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu } from "lucide-react";
import { cn } from "@/lib/cn";
import { navItems, siteConfig } from "@/config/site";
import { SignOutButton } from "@/components/auth/auth-gate";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex w-full max-w-[var(--layout-max-w)] flex-col px-4 py-4 sm:px-6">
      <header className="depth-surface mb-5 flex items-center justify-between gap-4 rounded-[10px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-200)]">
            <Cpu className="h-4 w-4 text-[var(--ds-gray-1000)]" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-[14px] font-semibold text-[var(--ds-gray-1000)]">
              {siteConfig.name}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">
              {siteConfig.tagline}
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition",
                  active
                    ? "bg-[var(--ds-gray-100)] text-[var(--ds-gray-1000)] shadow-[inset_0_0_0_1px_var(--ds-gray-alpha-400)]"
                    : "text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <span className="mx-1 h-5 w-px bg-[var(--ds-gray-alpha-400)]" />
          <SignOutButton />
        </nav>
      </header>
      <main className="flex flex-col gap-5 pb-10">{children}</main>
    </div>
  );
}
