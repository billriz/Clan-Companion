import { ChefHat, Sprout, Utensils } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  footer: React.ReactNode;
  children: React.ReactNode;
};

export function AuthShell({ eyebrow, title, description, footer, children }: AuthShellProps) {
  return (
    <main className="grid min-h-screen bg-plate-cream lg:grid-cols-[minmax(0,1fr)_480px]">
      <section className="hidden border-r bg-plate-paper px-10 py-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-plate-charcoal">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-subtle">
            <ChefHat className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-semibold">Clan Companion</p>
            <p className="text-sm text-muted-foreground">Recipe planning workspace</p>
          </div>
        </div>

        <div className="max-w-xl">
          <div className="mb-8 grid max-w-md grid-cols-2 gap-3">
            <div className="rounded-lg border bg-plate-cream p-5 shadow-subtle">
              <Utensils className="mb-8 h-7 w-7 text-primary" aria-hidden="true" />
              <p className="text-sm font-medium text-plate-charcoal">Recipes</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Save the meals worth repeating.
              </p>
            </div>
            <div className="rounded-lg border bg-[#F4E7DF] p-5 shadow-subtle">
              <Sprout className="mb-8 h-7 w-7 text-plate-terracotta" aria-hidden="true" />
              <p className="text-sm font-medium text-plate-charcoal">Weekly rhythm</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Keep planning quiet and organized.
              </p>
            </div>
          </div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-lg text-4xl font-semibold tracking-normal text-plate-charcoal">
            {title}
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">{description}</p>
        </div>

        <p className="text-sm text-muted-foreground">Built for meals, lists, and calmer weeks.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:min-h-0">
        <Card className="w-full max-w-md shadow-soft">
          <CardHeader>
            <div className="mb-5 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ChefHat className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold text-plate-charcoal">Clan Companion</p>
                <p className="text-sm text-muted-foreground">Recipe planning workspace</p>
              </div>
            </div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-plate-charcoal">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
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
