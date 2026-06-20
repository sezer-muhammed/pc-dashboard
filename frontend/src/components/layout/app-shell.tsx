"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Cpu,
  HardDrive,
  LayoutDashboard,
  Monitor,
  ScrollText,
  TerminalSquare,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { siteConfig } from "@/config/site";
import { SignOutButton } from "@/components/auth/auth-gate";
import { RefreshProvider, RefreshControl } from "@/components/dashboard/refresh-context";

const NAV: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/diagnostics", label: "System Diagnostics", icon: Activity },
  { href: "/terminal", label: "Terminal", icon: TerminalSquare },
  { href: "/display", label: "Display", icon: Monitor },
  { href: "/files", label: "Files", icon: HardDrive },
  { href: "/activity", label: "Activity", icon: ScrollText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;

  return (
    <RefreshProvider>
      <div className="flex min-h-screen text-[var(--ds-gray-1000)]">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--ds-gray-alpha-300)] bg-[var(--ds-background-100)] p-3 lg:flex">
          <div className="mb-4 flex items-center gap-2.5 px-2 py-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-200)]">
              <Cpu className="h-4 w-4 text-[var(--ds-gray-1000)]" aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-[14px] font-semibold text-[var(--ds-gray-1000)]">{siteConfig.name}</p>
              <p className="font-mono text-[10px] uppercase tracking-normal text-[var(--ds-gray-700)]">
                {siteConfig.shortName} console
              </p>
            </div>
          </div>

          <nav aria-label="Dashboard" className="grid gap-0.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[7px] px-3 py-2 text-[14px] font-medium transition",
                    isActive(item.href)
                      ? "bg-[var(--ds-gray-100)] text-[var(--ds-gray-1000)]"
                      : "text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-1000)]",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto px-2 pb-1 font-mono text-[11px] text-[var(--ds-gray-600)]">
            {siteConfig.tagline}
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--ds-gray-alpha-300)] bg-[color-mix(in_srgb,var(--ds-background-100)_88%,transparent)] px-4 backdrop-blur-md">
            {/* Mobile brand */}
            <span className="flex items-center gap-2 lg:hidden">
              <Cpu className="h-5 w-5 text-[var(--ds-gray-1000)]" aria-hidden />
              <span className="text-[14px] font-semibold">{siteConfig.name}</span>
            </span>
            <div className="min-w-0 flex-1" />
            <RefreshControl />
            <span aria-hidden className="h-5 w-px bg-[var(--ds-gray-alpha-300)]" />
            <SignOutButton />
          </header>

          {/* Mobile nav */}
          <nav
            aria-label="Dashboard compact"
            className="flex items-center gap-1 overflow-x-auto border-b border-[var(--ds-gray-alpha-300)] bg-[var(--ds-background-100)] px-3 py-2 lg:hidden"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-[6px] px-2.5 py-1.5 text-[13px] font-medium",
                  isActive(item.href)
                    ? "bg-[var(--ds-gray-100)] text-[var(--ds-gray-1000)]"
                    : "text-[var(--ds-gray-900)]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <main className="min-w-0 flex-1 px-4 py-5 sm:px-6">{children}</main>
        </div>
      </div>
    </RefreshProvider>
  );
}
