import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FeatureTone = "sage" | "terracotta" | "blue";

type FeatureCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: FeatureTone;
  href?: string;
  actionLabel?: string;
};

const toneClasses: Record<FeatureTone, string> = {
  sage: "bg-primary/10 text-primary",
  terracotta: "bg-gravy-brown/15 text-gravy-brown",
  blue: "bg-gravy-gold/15 text-gravy-brown",
};

export function FeatureCard({
  title,
  description,
  icon: Icon,
  tone,
  href,
  actionLabel = "Coming soon",
}: FeatureCardProps) {
  return (
    <Card className="h-full shadow-subtle transition hover:-translate-y-0.5 hover:shadow-soft">
      <CardHeader>
        <div
          className={cn(
            "mb-5 flex h-12 w-12 items-center justify-center rounded-md",
            toneClasses[tone],
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {href ? (
          <Link className={cn(buttonVariants({ variant: "secondary" }), "w-full")} href={href}>
            {actionLabel}
          </Link>
        ) : (
          <Button className="w-full" type="button" variant="secondary" disabled>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
