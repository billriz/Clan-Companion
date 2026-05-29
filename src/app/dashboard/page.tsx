import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, CalendarDays, ShoppingBasket } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { MealPlanCard } from "@/components/meal-planner/meal-plan-card";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getWeekEndKey, getWeekStartKey } from "@/lib/meal-plans";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { MealPlanWithRecipe } from "@/types/meal-plans";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const weekStartKey = getWeekStartKey(new Date());
  const weekEndKey = getWeekEndKey(weekStartKey);

  const [recipesCountResult, mealsCountResult, shoppingCountResult, weekPlanResult] =
    await Promise.all([
      supabase
        .from("recipes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("meal_plans")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("planned_date", weekStartKey)
        .lte("planned_date", weekEndKey),
      supabase
        .from("shopping_list_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("week_start", weekStartKey),
      supabase
        .from("meal_plans")
        .select("*, recipe:recipes(*)")
        .eq("user_id", user.id)
        .gte("planned_date", weekStartKey)
        .lte("planned_date", weekEndKey)
        .order("planned_date", { ascending: true })
        .order("meal_type", { ascending: true }),
    ]);

  const loadError =
    recipesCountResult.error ?? mealsCountResult.error ?? shoppingCountResult.error ?? weekPlanResult.error;

  const recipesTotal = recipesCountResult.count ?? 0;
  const mealsThisWeek = mealsCountResult.count ?? 0;
  const shoppingTotal = shoppingCountResult.count ?? 0;
  const plans = ((weekPlanResult.data ?? []) as MealPlanWithRecipe[]).slice(0, 7);

  const userName =
    typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim().length > 0
      ? user.user_metadata.full_name.trim().split(" ")[0]
      : "there";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 lg:max-w-5xl lg:px-8 lg:py-10">
      <PageHeader
        title={`Good morning, ${userName}!`}
        description="What's cooking this week?"
        actions={
          <Link className={cn(buttonVariants(), "gap-2 rounded-xl")} href="/meal-planner">
            Plan a Meal
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />

      {loadError ? (
        <section className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm leading-6 text-destructive shadow-subtle">
          Dashboard data could not be loaded. {loadError.message}
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard title="Recipes" value={recipesTotal} icon={BookOpen} tone="sage" />
            <StatCard title="Meal Plans" value={mealsThisWeek} icon={CalendarDays} tone="gold" />
            <StatCard title="On List" value={shoppingTotal} icon={ShoppingBasket} tone="brown" />
          </section>

          <section className="rounded-3xl border bg-card p-4 shadow-subtle sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-gravy-charcoal">{"This Week's Plan"}</h2>
              <Link className="text-sm font-semibold text-primary" href="/meal-planner">
                View all
              </Link>
            </div>

            {plans.length === 0 ? (
              <EmptyState
                title="Start your week with a plan."
                description="Add recipes to build your meal plan."
                actionLabel="Plan a Meal"
                actionHref="/meal-planner"
                className="border-0 bg-gravy-cream p-6 shadow-none"
              />
            ) : (
              <div className="space-y-2.5">
                {plans.map((plan) => (
                  <MealPlanCard key={plan.id} dayLabel={formatWeekday(plan.planned_date)} plan={plan} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function formatWeekday(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short" });
}
