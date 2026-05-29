"use client";

import { cn } from "@/lib/utils";

type FilterChipProps = {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

export function FilterChip({ label, active = false, onClick, className }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-9 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-subtle"
          : "border-border bg-gravy-paper text-muted-foreground hover:bg-secondary hover:text-gravy-charcoal",
        className,
      )}
    >
      {label}
    </button>
  );
}
