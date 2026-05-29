import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition",
  {
    variants: {
      variant: {
        default: "border-primary/25 bg-primary/10 text-primary",
        blue: "border-gravy-gold/35 bg-gravy-gold/18 text-gravy-brown",
        terracotta: "border-gravy-brown/30 bg-gravy-brown/12 text-gravy-brown",
        neutral: "border-border bg-secondary text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
