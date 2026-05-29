import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChefHat,
  ClipboardCheck,
  Package,
  ShoppingBasket,
} from "lucide-react";

import { FeatureCard } from "@/components/dashboard/feature-card";
import { OverviewStatCard } from "@/components/dashboard/overview-stat-card";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getWeekEndKey, getWeekStartKey } from "@/lib/meal-plans";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
};

const dashboardCards = [
  {
    title: "Recipes",
    description: "Save favorites and weeknight go-tos in one organized place.",
    icon: BookOpen,
    tone: "sage",
    href: "/recipes",
    actionLabel: "Open recipes",
  },
  {
    title: "Meal Planner",
    description: "Map breakfast, lunch, and dinner across the week.",
    icon: CalendarDays,
    tone: "terracotta",
    href: "/meal-planner",
    actionLabel: "Plan week",
  },
  {
    title: "Pantry",
    description: "Track what you have on hand before building your grocery list.",
    icon: Package,
    tone: "blue",
    href: "/pantry",
    actionLabel: "Open pantry",
  },
  {
    title: "Shopping List",
    description: "Generate and check off groceries from planned meals.",
    icon: ShoppingBasket,
    tone: "blue",
    href: "/shopping-list",
    actionLabel: "Open list",
  },
] as const;

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

  const [recipesCountResult, mealsCountResult, shoppingCountResult, checkedCountResult] =
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
        .from("shopping_list_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("week_start", weekStartKey)
        .eq("checked", true),
    ]);

  const loadError =
    recipesCountResult.error ??
    mealsCountResult.error ??
    shoppingCountResult.error ??
    checkedCountResult.error;

  const recipesTotal = recipesCountResult.count ?? 0;
  const mealsThisWeek = mealsCountResult.count ?? 0;
  const shoppingTotal = shoppingCountResult.count ?? 0;
  const shoppingChecked = checkedCountResult.count ?? 0;
  const shoppingProgress =
    shoppingTotal > 0 ? Math.round((shoppingChecked / shoppingTotal) * 100) : 0;

  const userName =
    typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim().length > 0
      ? user.user_metadata.full_name.trim()
      : "there";

  const hasAnyData = recipesTotal > 0 || mealsThisWeek > 0 || shoppingTotal > 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="grid gap-6 rounded-2xl border bg-card p-5 shadow-subtle lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end sm:p-6">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-gravy-paper px-3 py-1 text-sm font-medium text-gravy-brown shadow-subtle">
            <ChefHat className="h-4 w-4" aria-hidden="true" />
            Welcome to GravyTime
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-gravy-charcoal sm:text-4xl">
            Hello, {userName}. Your planning workspace is ready.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Keep the flow simple: save recipes, plan this week, and generate groceries.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <Link className={cn(buttonVariants(), "gap-2")} href="/meal-planner">
            Continue Planning
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link className={cn(buttonVariants({ variant: "secondary" }), "gap-2")} href="/recipes/new">
            Add Recipe
          </Link>
        </div>
      </section>

      <InstallPrompt />

      {loadError ? (
        <section className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm leading-6 text-destructive shadow-subtle">
          Dashboard data could not be loaded. {loadError.message}
        </section>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <OverviewStatCard
              title="Total Recipes"
              value={String(recipesTotal)}
              description={recipesTotal > 0 ? "Recipes saved in your library" : "Add your first recipe to start"}
              icon={BookOpen}
              tone="sage"
            />
            <OverviewStatCard
              title="Meals Planned This Week"
              value={String(mealsThisWeek)}
              description={mealsThisWeek > 0 ? `${Math.max(21 - mealsThisWeek, 0)} slots still open` : "No meals planned yet"}
              icon={CalendarDays}
              tone="terracotta"
            />
            <OverviewStatCard
              title="Shopping List Progress"
              value={`${shoppingProgress}%`}
              description={shoppingTotal > 0 ? `${shoppingChecked} of ${shoppingTotal} checked` : "No items for this week yet"}
              icon={ClipboardCheck}
              tone="blue"
            />
            <OverviewStatCard
              title="Shopping Items"
              value={String(shoppingTotal)}
              description="Items currently on this week's list"
              icon={ShoppingBasket}
              tone="sage"
            />
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {dashboardCards.map((card) => (
              <FeatureCard
                key={card.title}
                title={card.title}
                description={card.description}
                icon={card.icon}
                tone={card.tone}
                href={"href" in card ? card.href : undefined}
                actionLabel={"actionLabel" in card ? card.actionLabel : undefined}
              />
            ))}
          </section>

          {!hasAnyData ? (
            <section className="rounded-2xl border border-dashed bg-gravy-paper/70 p-6 shadow-subtle">
              <Badge variant="terracotta">Get started</Badge>
              <h2 className="mt-4 text-xl font-semibold text-gravy-charcoal">Set up your first planning cycle</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Start by creating a few recipes. Then add meals to this week and generate your
                shopping list from those ingredients.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link className={cn(buttonVariants(), "gap-2")} href="/recipes/new">
                  Create Recipe
                </Link>
                <Link className={cn(buttonVariants({ variant: "secondary" }), "gap-2")} href="/meal-planner">
                  Open Planner
                </Link>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
