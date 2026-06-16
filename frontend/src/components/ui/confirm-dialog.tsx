"use client";

import { useEffect } from "react";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px]"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <Surface
        tone="raised"
        className="depth-surface w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[16px] font-semibold text-[var(--ds-gray-1000)]">{title}</h2>
        <div className="mt-1.5 text-[13px] leading-5 text-[var(--ds-gray-900)]">{message}</div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            className={cn(
              danger &&
                "border-[var(--ds-red-700)] bg-[var(--ds-red-700)] text-white hover:border-[var(--ds-red-800)] hover:bg-[var(--ds-red-800)]",
            )}
          >
            {confirmLabel}
          </Button>
        </div>
      </Surface>
    </div>
  );
}
