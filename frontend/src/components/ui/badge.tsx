import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const badgeVariants = cva(
  "inline-flex h-6 shrink-0 items-center rounded-[6px] border px-2 text-[11px] font-medium leading-none shadow-[inset_0_1px_0_rgb(255_255_255_/_0.76),0_1px_1px_rgb(0_0_0_/_0.04)]",
  {
    defaultVariants: {
      tone: "gray",
    },
    variants: {
      tone: {
        amber:
          "border-[color-mix(in_srgb,var(--ds-amber-400)_76%,var(--ds-gray-alpha-400))] bg-[color-mix(in_srgb,var(--ds-amber-100)_72%,var(--ds-background-100))] text-[var(--ds-amber-1000)]",
        blue: "border-[color-mix(in_srgb,var(--ds-blue-400)_76%,var(--ds-gray-alpha-400))] bg-[color-mix(in_srgb,var(--ds-blue-100)_72%,var(--ds-background-100))] text-[var(--ds-blue-1000)]",
        gray: "border-[var(--ds-gray-alpha-400)] bg-[color-mix(in_srgb,var(--ds-gray-100)_72%,var(--ds-background-100))] text-[var(--ds-gray-1000)]",
        green:
          "border-[color-mix(in_srgb,var(--ds-green-400)_76%,var(--ds-gray-alpha-400))] bg-[color-mix(in_srgb,var(--ds-green-100)_72%,var(--ds-background-100))] text-[var(--ds-green-1000)]",
        pink: "border-[color-mix(in_srgb,var(--ds-pink-400)_76%,var(--ds-gray-alpha-400))] bg-[color-mix(in_srgb,var(--ds-pink-100)_72%,var(--ds-background-100))] text-[var(--ds-pink-1000)]",
        purple:
          "border-[color-mix(in_srgb,var(--ds-purple-400)_76%,var(--ds-gray-alpha-400))] bg-[color-mix(in_srgb,var(--ds-purple-100)_72%,var(--ds-background-100))] text-[var(--ds-purple-1000)]",
        teal: "border-[color-mix(in_srgb,var(--ds-teal-400)_76%,var(--ds-gray-alpha-400))] bg-[color-mix(in_srgb,var(--ds-teal-100)_72%,var(--ds-background-100))] text-[var(--ds-teal-1000)]",
      },
    },
  },
);

export function Badge({
  children,
  className,
  tone = "gray",
}: {
  children: ReactNode;
  className?: string;
} & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)}>{children}</span>;
}
