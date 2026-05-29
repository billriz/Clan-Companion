import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: "sage" | "gold" | "brown";
  className?: string;
};

const toneClass: Record<NonNullable<StatCardProps["tone"]>, string> = {
  sage: "bg-primary/10 text-primary",
  gold: "bg-gravy-gold/15 text-gravy-brown",
  brown: "bg-gravy-brown/15 text-gravy-brown",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "sage",
  className,
}: StatCardProps) {
  return (
    <article className={cn("rounded-2xl border bg-card p-4 shadow-subtle", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gravy-charcoal">{value}</p>
          {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {Icon ? (
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", toneClass[tone])}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
    </article>
  );
}
