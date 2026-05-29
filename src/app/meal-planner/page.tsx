import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, RefreshCcw } from "lucide-react";

import { MealPlannerClient } from "@/components/meal-planner/meal-planner-client";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getWeekEndKey, getWeekStartKey } from "@/lib/meal-plans";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { MealPlanWithRecipe } from "@/types/meal-plans";

export const metadata: Metadata = {
  title: "Meal Planner",
};

export default async function MealPlannerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const initialWeekStartKey = getWeekStartKey(new Date());
  const initialWeekEndKey = getWeekEndKey(initialWeekStartKey);

  const [recipesResponse, plansResponse] = await Promise.all([
    supabase.from("recipes").select("*").order("title", { ascending: true }),
    supabase
      .from("meal_plans")
      .select("*, recipe:recipes(*)")
      .gte("planned_date", initialWeekStartKey)
      .lte("planned_date", initialWeekEndKey)
      .order("planned_date", { ascending: true })
      .order("meal_type", { ascending: true })
      .order("created_at", { ascending: false }),
  ]);

  const loadError = recipesResponse.error ?? plansResponse.error;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="default">Weekly planning</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-gravy-charcoal sm:text-4xl">
            Meal Planner
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Plan breakfast, lunch, and dinner for the week without turning dinner into a spreadsheet.
          </p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-subtle">
          <CalendarDays className="h-7 w-7" aria-hidden="true" />
        </div>
      </section>

      {loadError ? (
        <section className="rounded-2xl border border-gravy-brown/30 bg-gravy-brown/10 p-5 text-sm leading-6 text-gravy-brown shadow-subtle">
          <p>Meal planner data could not be loaded. {loadError.message}</p>
          <div className="mt-4">
            <Link className={cn(buttonVariants({ variant: "secondary" }), "gap-2")} href="/meal-planner">
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Retry
            </Link>
          </div>
        </section>
      ) : (
        <MealPlannerClient
          initialPlans={(plansResponse.data ?? []) as MealPlanWithRecipe[]}
          initialWeekStartKey={initialWeekStartKey}
          recipes={recipesResponse.data ?? []}
          userId={user.id}
        />
      )}
    </div>
  );
}
