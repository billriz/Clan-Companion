import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/10 text-plate-olive",
        blue: "border-plate-blue/20 bg-plate-blue/10 text-plate-blue",
        terracotta: "border-plate-terracotta/25 bg-plate-terracotta/10 text-plate-terracotta",
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
