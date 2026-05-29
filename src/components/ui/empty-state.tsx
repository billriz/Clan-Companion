import Link from "next/link";
import { CookingPot } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  className?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  className,
}: EmptyStateProps) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-dashed border-border/80 bg-gravy-paper p-8 text-center shadow-subtle",
        className,
      )}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gravy-gold/15 text-gravy-brown">
        <CookingPot className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-semibold text-gravy-charcoal">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>

      {actionLabel ? (
        actionHref ? (
          <Link className={cn(buttonVariants({ variant: "secondary" }), "mt-6 inline-flex")} href={actionHref}>
            {actionLabel}
          </Link>
        ) : (
          <SecondaryButton className="mt-6" type="button" onClick={actionOnClick}>
            {actionLabel}
          </SecondaryButton>
        )
      ) : null}
    </section>
  );
}
