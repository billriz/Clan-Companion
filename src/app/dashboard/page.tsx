import Link from "next/link";
import { BookOpen, CalendarDays, ChefHat, ListChecks, ShoppingBasket } from "lucide-react";

import { FeatureCard } from "@/components/dashboard/feature-card";
import { buttonVariants } from "@/components/ui/button";

const dashboardCards = [
  {
    title: "Recipes",
    description: "A home for saved meals, family favorites, and cooking notes.",
    icon: BookOpen,
    tone: "sage",
    href: "/recipes",
    actionLabel: "Open recipes",
  },
  {
    title: "Meal Planner",
    description: "A weekly planning space for breakfast, lunch, dinner, and prep.",
    icon: CalendarDays,
    tone: "terracotta",
    href: "/meal-planner",
    actionLabel: "Plan week",
  },
  {
    title: "Shopping List",
    description: "A clean checklist for grocery runs and pantry restocks.",
    icon: ShoppingBasket,
    tone: "blue",
    href: "/shopping-list",
    actionLabel: "Preview list",
  },
] as const;

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border bg-plate-paper px-3 py-1 text-sm font-medium text-plate-olive shadow-subtle">
            <ChefHat className="h-4 w-4" aria-hidden="true" />
            Clan Companion
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-normal text-plate-charcoal sm:text-4xl">
            Your recipe planning dashboard is ready.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Keep the first version focused: sign in, land here, and build the planning tools from
            this calm foundation.
          </p>
        </div>

        <div className="rounded-lg border bg-plate-paper p-4 shadow-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ListChecks className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-plate-charcoal">Today</p>
              <p className="text-sm text-muted-foreground">No meals planned yet.</p>
            </div>
          </div>
        </div>
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

      <section className="rounded-lg border border-dashed bg-plate-paper/70 p-6 shadow-subtle">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-plate-charcoal">Weekly plan</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Build this week around saved recipes, meal slots, and future grocery prep.
            </p>
          </div>
          <Link className={buttonVariants()} href="/meal-planner">
            Open Planner
          </Link>
        </div>
      </section>
    </div>
  );
}
