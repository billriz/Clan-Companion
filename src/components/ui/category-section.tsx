import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type CategorySectionProps = {
  title: string;
  count?: number;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
};

export function CategorySection({
  title,
  count,
  children,
  className,
  collapsible = false,
  expanded = true,
  onToggle,
}: CategorySectionProps) {
  const heading = (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold text-gravy-charcoal">{title}</h2>
      <div className="flex items-center gap-2">
        {typeof count === "number" ? (
          <span className="rounded-full bg-gravy-gold/15 px-2 py-0.5 text-xs font-semibold text-gravy-brown">
            {count}
          </span>
        ) : null}
        {collapsible ? (
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground transition", expanded ? "rotate-0" : "-rotate-90")}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );

  return (
    <section className={cn("rounded-2xl border bg-card p-4 shadow-subtle", className)}>
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {heading}
        </button>
      ) : (
        heading
      )}
      {expanded ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}
