import { cn } from "@/lib/cn";

export function ProgressCell({
  className,
  color = "var(--ds-gray-1000)",
  showValue = false,
  value,
}: {
  className?: string;
  color?: string;
  showValue?: boolean;
  value: number;
}) {
  return (
    <span className={cn("inline-flex w-[104px] items-center gap-2", className)}>
      <span className="block h-2 flex-1 rounded-full border border-[var(--ds-gray-alpha-300)] bg-[var(--ds-background-200)] p-[2px]">
        <span
          className="block h-full rounded-full"
          style={{ background: color, width: `${value}%` }}
        />
      </span>
      {showValue ? (
        <span className="w-8 font-mono text-[11px] text-[var(--ds-gray-900)]">
          {value}%
        </span>
      ) : null}
    </span>
  );
}
