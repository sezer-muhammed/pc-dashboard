import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type SurfaceTone = "flat" | "raised" | "sunken";

const toneClasses: Record<SurfaceTone, string> = {
  flat: "border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)]",
  raised:
    "depth-surface border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)]",
  sunken:
    "border-[var(--ds-gray-alpha-300)] bg-[var(--ds-background-200)] shadow-[inset_0_1px_2px_#0000000a]",
};

export function Surface({
  children,
  className,
  tone = "raised",
  ...props
}: HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  className?: string;
  tone?: SurfaceTone;
}) {
  return (
    <section
      className={cn("rounded-[8px] border", toneClasses[tone], className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  action,
  eyebrow,
  title,
  summary,
}: {
  action?: ReactNode;
  eyebrow?: string;
  title: string;
  summary?: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--ds-gray-alpha-400)] p-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 font-mono text-[11px] uppercase tracking-normal text-[var(--ds-gray-700)]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-[18px] font-semibold leading-6 text-[var(--ds-gray-1000)]">
          {title}
        </h2>
        {summary ? (
          <p className="mt-1 max-w-2xl text-[13px] leading-5 text-[var(--ds-gray-900)]">
            {summary}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
