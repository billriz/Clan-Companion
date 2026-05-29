import { ClipboardList, Sprout, Utensils } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  footer: React.ReactNode;
  children: React.ReactNode;
};

export function AuthShell({ eyebrow, title, description, footer, children }: AuthShellProps) {
  return (
    <main className="grid min-h-screen bg-gravy-cream lg:grid-cols-[minmax(0,1fr)_520px]">
      <section className="hidden border-r bg-gravy-paper px-10 py-12 lg:flex lg:flex-col lg:justify-between">
        <div className="max-w-xs">
          <BrandLogo className="max-w-[12.5rem]" priority />
          <p className="mt-2 text-sm text-muted-foreground">{BRAND.tagline}</p>
        </div>

        <div className="max-w-xl">
          <div className="mb-8 grid max-w-md grid-cols-2 gap-3">
            <div className="rounded-2xl border bg-gravy-cream p-5 shadow-subtle">
              <Utensils className="mb-8 h-7 w-7 text-primary" aria-hidden="true" />
              <p className="text-sm font-medium text-gravy-charcoal">Recipes</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Save the meals worth repeating.
              </p>
            </div>
            <div className="rounded-2xl border bg-gravy-gold/12 p-5 shadow-subtle">
              <Sprout className="mb-8 h-7 w-7 text-gravy-brown" aria-hidden="true" />
              <p className="text-sm font-medium text-gravy-charcoal">Meal plans</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Build your week in a calm, flexible planner.
              </p>
            </div>
          </div>
          <div className="mb-6 rounded-2xl border bg-gravy-cream p-5 shadow-subtle">
            <ClipboardList className="mb-8 h-7 w-7 text-gravy-brown" aria-hidden="true" />
            <p className="text-sm font-medium text-gravy-charcoal">Shopping lists</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Turn planned meals into organized grocery lists in one click.
            </p>
          </div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-lg text-4xl font-semibold tracking-normal text-gravy-charcoal">
            {title}
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">{description}</p>
        </div>

        <p className="text-sm text-muted-foreground">
          Save your favorite recipes, plan your week, and turn meals into organized shopping lists.
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:min-h-0">
        <Card className="w-full max-w-sm border-border/70 bg-gravy-paper shadow-soft">
          <CardHeader>
            <div className="mb-3 flex items-center justify-center gap-3 lg:hidden">
              <BrandLogo className="max-w-[10rem]" />
            </div>
            <p className="text-center text-sm font-medium uppercase tracking-[0.16em] text-primary">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-center text-3xl font-semibold tracking-normal text-gravy-charcoal">
              {title}
            </h2>
            <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">{description}</p>
          </CardHeader>
          <CardContent>{children}</CardContent>
          <CardFooter className="justify-center text-center text-sm text-muted-foreground">
            {footer}
          </CardFooter>
        </Card>
      </section>
    </main>
  );
}
