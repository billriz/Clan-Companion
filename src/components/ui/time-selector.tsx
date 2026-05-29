import { Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";

type TimeSelectorProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: number[];
  disabled?: boolean;
  className?: string;
};

const defaultOptions = [5, 10, 15, 20, 30, 40, 45, 60, 75, 90, 120];

export function TimeSelector({
  id,
  label,
  value,
  onChange,
  options = defaultOptions,
  disabled = false,
  className,
}: TimeSelectorProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="text-sm font-medium text-gravy-charcoal">
        {label}
      </label>
      <div className="relative">
        <Clock3
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <select
          id={id}
          value={value}
          disabled={disabled}
          className="h-11 w-full appearance-none rounded-xl border border-input bg-gravy-paper pl-10 pr-8 text-sm text-gravy-charcoal shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select time</option>
          {options.map((minutes) => (
            <option key={minutes} value={String(minutes)}>
              {minutes} min
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
