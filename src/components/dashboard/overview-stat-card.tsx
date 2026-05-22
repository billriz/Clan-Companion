import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type OverviewStatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone?: "sage" | "terracotta" | "blue";
};

const toneClasses: Record<NonNullable<OverviewStatCardProps["tone"]>, string> = {
  sage: "bg-primary/10 text-primary",
  terracotta: "bg-plate-terracotta/15 text-plate-terracotta",
  blue: "bg-plate-blue/15 text-plate-blue",
};

export function OverviewStatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "sage",
}: OverviewStatCardProps) {
  return (
    <article className="rounded-2xl border bg-white p-4 shadow-subtle sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-plate-charcoal">{value}</p>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", toneClasses[tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}
