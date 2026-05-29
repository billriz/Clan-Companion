"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuantityStepperProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  className?: string;
};

export function QuantityStepper({
  label,
  value,
  min = 1,
  max = 24,
  onChange,
  className,
}: QuantityStepperProps) {
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-gravy-charcoal">{label}</p>
      <div className="inline-flex items-center gap-2 rounded-xl border bg-gravy-paper p-1">
        <Button
          type="button"
          variant="ghost"
          className="h-9 w-9 rounded-lg px-0"
          aria-label={`Decrease ${label}`}
          disabled={atMin}
          onClick={() => onChange(Math.max(value - 1, min))}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className="min-w-10 text-center text-sm font-semibold text-gravy-charcoal">{value}</span>
        <Button
          type="button"
          variant="ghost"
          className="h-9 w-9 rounded-lg px-0"
          aria-label={`Increase ${label}`}
          disabled={atMax}
          onClick={() => onChange(Math.min(value + 1, max))}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
