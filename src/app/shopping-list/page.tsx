import Link from "next/link";
import { ArrowRight, ShoppingBasket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ShoppingListPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="rounded-2xl border bg-white p-6 shadow-subtle sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-plate-blue/15 text-plate-blue">
          <ShoppingBasket className="h-7 w-7" aria-hidden="true" />
        </div>
        <Badge className="mt-6" variant="blue">
          Phase 4
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-plate-charcoal sm:text-4xl">
          Shopping List
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
          Shopping list generation will build from planned recipes, ingredients, and weekly meal slots.
        </p>
        <Link className={cn(buttonVariants(), "mt-6 gap-2 rounded-xl")} href="/meal-planner">
          Open Meal Planner
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
