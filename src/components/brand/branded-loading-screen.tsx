import { CheckCircle2, ClipboardList, ShoppingBag, Soup } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND } from "@/lib/brand";

const features = [
  { label: "Save recipes", icon: Soup },
  { label: "Plan your meals", icon: ClipboardList },
  { label: "Create shopping lists", icon: ShoppingBag },
  { label: "Cook with confidence", icon: CheckCircle2 },
] as const;

type BrandedLoadingScreenProps = {
  message?: string;
};

export function BrandedLoadingScreen({ message = "Loading your kitchen workspace..." }: BrandedLoadingScreenProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gravy-cream px-4 py-8">
      <section className="w-full max-w-md rounded-[2rem] border border-border/70 bg-gravy-paper p-7 shadow-soft">
        <BrandLogo className="mx-auto flex max-w-[11.5rem] flex-col items-center text-center" priority />
        <p className="mt-3 text-center text-sm text-muted-foreground">{BRAND.tagline}</p>
        <div className="mt-6 space-y-2">
          {features.map((feature) => (
            <div key={feature.label} className="flex items-center gap-3 rounded-xl bg-gravy-cream px-3 py-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <feature.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-gravy-charcoal">{feature.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">{message}</p>
      </section>
    </main>
  );
}
