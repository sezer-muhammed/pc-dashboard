"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type RecordTableColumn<T> = {
  align?: "left" | "right";
  className?: string;
  header: string;
  key: string;
  render: (row: T) => ReactNode;
};

export function RecordTable<T>({
  columns,
  fit = false,
  getRowId,
  minWidth = 640,
  onRowClick,
  rowClassName,
  rows,
}: {
  columns: readonly RecordTableColumn<T>[];
  fit?: boolean;
  getRowId: (row: T) => string;
  minWidth?: number;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  rows: readonly T[];
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: T) {
    if (!onRowClick) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick(row);
    }
  }

  return (
    <div className={cn(fit ? "overflow-hidden" : "overflow-x-auto")}>
      <table
        className={cn("w-full border-collapse text-left text-[13px]", fit && "table-fixed")}
        style={fit ? undefined : { minWidth }}
      >
        <thead>
          <tr className="border-b border-[var(--ds-gray-alpha-400)] bg-[var(--ds-gray-100)]">
            {columns.map((column) => (
              <th
                className={cn(
                  "h-9 px-3 align-middle font-mono text-[11px] font-medium uppercase tracking-normal text-[var(--ds-gray-700)]",
                  column.align === "right" && "text-right",
                  column.className,
                )}
                key={column.key}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const interactive = Boolean(onRowClick);

            return (
              <tr
                className={cn(
                  "border-b border-[var(--ds-gray-alpha-300)] bg-[var(--ds-background-100)] transition last:border-b-0 hover:bg-[var(--ds-gray-100)]",
                  interactive && "cursor-pointer outline-none focus-visible:shadow-[var(--ds-focus-ring)]",
                  rowClassName?.(row),
                )}
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={(event) => handleKeyDown(event, row)}
                role={interactive ? "button" : undefined}
                tabIndex={interactive ? 0 : undefined}
              >
                {columns.map((column) => (
                  <td
                    className={cn(
                      "h-11 px-3 align-middle text-[var(--ds-gray-1000)]",
                      column.align === "right" && "text-right tabular-nums",
                      column.className,
                    )}
                    key={column.key}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
