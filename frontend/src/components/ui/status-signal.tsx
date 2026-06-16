import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type StatusSignalVariant = "dot" | "inline" | "pill" | "cell" | "glass";

export function StatusSignal({
  children,
  className,
  color,
  pulse = false,
  variant = "inline",
}: {
  children?: ReactNode;
  className?: string;
  color: string;
  pulse?: boolean;
  variant?: StatusSignalVariant;
}) {
  const dot = (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--ds-gray-alpha-500)]",
        pulse && "animate-pulse",
      )}
      style={{ background: color }}
    />
  );

  if (variant === "dot") {
    return dot;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-medium text-[var(--ds-gray-1000)]",
        variant === "inline" && "text-[13px]",
        variant === "pill" &&
          "h-6 rounded-[5px] border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-200)] px-2 text-[12px]",
        variant === "cell" && "text-[13px]",
        variant === "glass" &&
          "h-7 rounded-[7px] border border-white/30 bg-white/[0.07] px-2.5 text-[12px] text-white shadow-[inset_0_1px_0_rgb(255_255_255_/_0.76),inset_0_-1px_0_rgb(255_255_255_/_0.12),0_10px_24px_-18px_rgb(0_0_0_/_0.72)] backdrop-blur-xl backdrop-brightness-110 backdrop-saturate-200",
        className,
      )}
    >
      {dot}
      {children}
    </span>
  );
}
