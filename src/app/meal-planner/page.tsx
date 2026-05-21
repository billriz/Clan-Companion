import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { MealPlannerClient } from "@/components/meal-planner/meal-planner-client";
import { Badge } from "@/components/ui/badge";
import { getWeekEndKey, getWeekStartKey } from "@/lib/meal-plans";
import { createClient } from "@/lib/supabase/server";
import type { MealPlanWithRecipe } from "@/types/meal-plans";

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
          <Badge variant="default">Phase 3</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-plate-charcoal sm:text-4xl">
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
        <div className="rounded-2xl border border-plate-terracotta/30 bg-plate-terracotta/10 p-5 text-sm leading-6 text-plate-terracotta shadow-subtle">
          Meal planner data could not be loaded. {loadError.message}
        </div>
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
