import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ClipboardList, ShoppingBag, Soup } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { buttonVariants } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Good meals start here",
};

const features = [
  { label: "Save recipes", icon: Soup },
  { label: "Plan your meals", icon: ClipboardList },
  { label: "Create shopping lists", icon: ShoppingBag },
  { label: "Cook with confidence", icon: CheckCircle2 },
] as const;

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gravy-cream px-4 py-8">
      <section className="w-full max-w-sm rounded-[2rem] border border-border/70 bg-gravy-paper p-7 shadow-soft">
        <BrandLogo className="mx-auto flex max-w-[12rem] flex-col items-center" priority />

        <h1 className="mt-6 text-center text-4xl font-semibold leading-tight tracking-normal text-gravy-charcoal">
          {BRAND.tagline}
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-muted-foreground">
          Save recipes, plan your week, and turn meals into organized shopping lists.
        </p>

        <div className="mt-5 grid gap-2">
          {features.map((feature) => (
            <div key={feature.label} className="flex items-center gap-3 rounded-xl bg-gravy-cream px-3 py-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <feature.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-gravy-charcoal">{feature.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2" aria-label="Onboarding progress">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="h-2 w-2 rounded-full bg-gravy-gold/45" />
          <span className="h-2 w-2 rounded-full bg-gravy-gold/45" />
        </div>

        <div className="mt-6 grid gap-2">
          <Link className={cn(buttonVariants(), "h-11 rounded-xl")} href="/signup">
            Get Started
          </Link>
          <Link
            className={cn(buttonVariants({ variant: "secondary" }), "h-11 rounded-xl")}
            href="/login"
          >
            Log In
          </Link>
        </div>
      </section>
    </main>
  );
}
