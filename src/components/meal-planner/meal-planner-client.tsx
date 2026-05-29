"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
} from "lucide-react";

import { AddMealDialog } from "@/components/meal-planner/add-meal-dialog";
import { MealSlot } from "@/components/meal-planner/meal-slot";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MEAL_TYPES,
  addDays,
  formatDateKey,
  formatDayName,
  formatDayNumber,
  formatLongDay,
  formatWeekRange,
  getMealPlanWeekKey,
  getWeekDays,
  getWeekEndKey,
  getWeekStartKey,
  groupMealPlansBySlot,
  isTodayKey,
  parseDateKey,
  sortMealPlans,
} from "@/lib/meal-plans";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { MealPlanWithRecipe, MealType } from "@/types/meal-plans";
import type { Recipe } from "@/types/recipes";

type MealPlannerClientProps = {
  initialPlans: MealPlanWithRecipe[];
  initialWeekStartKey: string;
  recipes: Recipe[];
  userId: string;
};

type DialogState = {
  dateKey: string;
  mealType: MealType;
};

export function MealPlannerClient({
  initialPlans,
  initialWeekStartKey,
  recipes,
  userId,
}: MealPlannerClientProps) {
  const [weekStartKey, setWeekStartKey] = useState(initialWeekStartKey);
  const [activeDateKey, setActiveDateKey] = useState(getDefaultActiveDate(initialWeekStartKey));
  const [plansByWeek, setPlansByWeek] = useState<Record<string, MealPlanWithRecipe[]>>({
    [initialWeekStartKey]: initialPlans,
  });
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);
  const [removingPlanId, setRemovingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlightWeeks = useRef(new Set<string>());

  const weekDays = useMemo(() => getWeekDays(weekStartKey), [weekStartKey]);
  const plans = useMemo(() => plansByWeek[weekStartKey] ?? [], [plansByWeek, weekStartKey]);
  const groupedPlans = useMemo(() => groupMealPlansBySlot(plans), [plans]);
  const activeDay = weekDays.find((day) => formatDateKey(day) === activeDateKey) ?? weekDays[0];
  const activeDayKey = formatDateKey(activeDay);

  const plannedCount = plans.length;
  const totalSlots = MEAL_TYPES.length * 7;
  const openSlots = Math.max(totalSlots - plannedCount, 0);

  useEffect(() => {
    if (plansByWeek[weekStartKey] || inFlightWeeks.current.has(weekStartKey)) {
      return;
    }

    let shouldIgnore = false;
    inFlightWeeks.current.add(weekStartKey);
    setIsLoadingWeek(true);
    setError(null);

    async function fetchWeekPlans() {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("meal_plans")
        .select("*, recipe:recipes(*)")
        .gte("planned_date", weekStartKey)
        .lte("planned_date", getWeekEndKey(weekStartKey))
        .order("planned_date", { ascending: true })
        .order("meal_type", { ascending: true })
        .order("created_at", { ascending: false });

      if (shouldIgnore) {
        return;
      }

      if (fetchError) {
        setError(fetchError.message);
        setIsLoadingWeek(false);
        inFlightWeeks.current.delete(weekStartKey);
        return;
      }

      setPlansByWeek((currentPlans) => ({
        ...currentPlans,
        [weekStartKey]: ((data ?? []) as MealPlanWithRecipe[]).sort(sortMealPlans),
      }));
      setIsLoadingWeek(false);
      inFlightWeeks.current.delete(weekStartKey);
    }

    void fetchWeekPlans();

    return () => {
      shouldIgnore = true;
    };
  }, [plansByWeek, weekStartKey]);

  function moveWeek(direction: "previous" | "next") {
    const nextWeekStartKey = formatDateKey(
      addDays(parseDateKey(weekStartKey), direction === "next" ? 7 : -7),
    );
    setWeekStartKey(nextWeekStartKey);
    setActiveDateKey(getDefaultActiveDate(nextWeekStartKey));
    setError(null);
    setNotice(null);
  }

  function returnToCurrentWeek() {
    const currentWeekStartKey = getWeekStartKey(new Date());
    setWeekStartKey(currentWeekStartKey);
    setActiveDateKey(getDefaultActiveDate(currentWeekStartKey));
    setError(null);
    setNotice(null);
  }

  function retryCurrentWeek() {
    setError(null);
    setNotice(null);
    setPlansByWeek((currentPlans) => {
      const nextPlans = { ...currentPlans };
      delete nextPlans[weekStartKey];
      return nextPlans;
    });
  }

  function openAddMeal(dateKey: string, mealType: MealType) {
    setDialogState({ dateKey, mealType });
    setError(null);
    setNotice(null);
  }

  function handleMealAdded(plan: MealPlanWithRecipe) {
    const planWeekKey = getMealPlanWeekKey(plan);

    setPlansByWeek((currentPlans) => {
      const existingPlans = currentPlans[planWeekKey] ?? [];
      const nextPlans = [
        plan,
        ...existingPlans.filter(
          (existingPlan) =>
            existingPlan.id !== plan.id ||
            existingPlan.planned_date !== plan.planned_date ||
            existingPlan.meal_type !== plan.meal_type,
        ),
      ]
        .filter(
          (existingPlan, index, allPlans) =>
            allPlans.findIndex(
              (candidatePlan) =>
                candidatePlan.planned_date === existingPlan.planned_date &&
                candidatePlan.meal_type === existingPlan.meal_type,
            ) === index,
        )
        .sort(sortMealPlans);

      return {
        ...currentPlans,
        [planWeekKey]: nextPlans,
      };
    });

    setWeekStartKey(planWeekKey);
    setActiveDateKey(plan.planned_date);
    setNotice(`${plan.recipe?.title ?? "Meal"} added to ${plan.meal_type}.`);
  }

  async function handleRemoveMeal(plan: MealPlanWithRecipe) {
    const shouldRemove = window.confirm(`Remove ${plan.recipe?.title ?? "this meal"} from ${plan.meal_type}?`);

    if (!shouldRemove) {
      return;
    }

    setRemovingPlanId(plan.id);
    setError(null);
    setNotice(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("meal_plans")
      .delete()
      .eq("id", plan.id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
      setRemovingPlanId(null);
      return;
    }

    const planWeekKey = getMealPlanWeekKey(plan);
    setPlansByWeek((currentPlans) => ({
      ...currentPlans,
      [planWeekKey]: (currentPlans[planWeekKey] ?? []).filter(
        (existingPlan) => existingPlan.id !== plan.id,
      ),
    }));
    setRemovingPlanId(null);
    setNotice(`${plan.recipe?.title ?? "Meal"} was removed from ${plan.meal_type}.`);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-subtle sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Badge variant="blue">Weekly planner</Badge>
          <h2 className="mt-3 text-2xl font-semibold text-gravy-charcoal sm:text-3xl">
            {formatWeekRange(weekStartKey)}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Breakfast, lunch, and dinner in one lightweight weekly view.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            aria-label="Previous week"
            className="h-11 w-11 rounded-xl px-0"
            title="Previous week"
            type="button"
            variant="secondary"
            onClick={() => moveWeek("previous")}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <Button
            className="h-11 gap-2 rounded-xl"
            type="button"
            variant="secondary"
            onClick={returnToCurrentWeek}
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Current Week
          </Button>
          <Button
            aria-label="Next week"
            className="h-11 w-11 rounded-xl px-0"
            title="Next week"
            type="button"
            variant="secondary"
            onClick={() => moveWeek("next")}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Button>
          <Button
            className="h-11 gap-2 rounded-xl"
            disabled={recipes.length === 0}
            type="button"
            onClick={() => openAddMeal(activeDayKey, "Dinner")}
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Add Meal
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4 shadow-subtle">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Planned meals</p>
          <p className="mt-2 text-2xl font-semibold text-gravy-charcoal">{plannedCount}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-subtle">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Open slots</p>
          <p className="mt-2 text-2xl font-semibold text-gravy-charcoal">{openSlots}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-subtle">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recipes ready</p>
          <p className="mt-2 text-2xl font-semibold text-gravy-charcoal">{recipes.length}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-subtle">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected day</p>
          <p className="mt-2 text-base font-semibold text-gravy-charcoal">{formatLongDay(activeDay)}</p>
        </div>
      </section>

      {error ? (
        <div
          className="flex flex-col gap-3 rounded-2xl border border-gravy-brown/30 bg-gravy-brown/10 px-4 py-3 text-sm text-gravy-brown shadow-subtle sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <span>{error}</span>
          <Button className="h-9 gap-2 self-start" type="button" variant="secondary" onClick={retryCurrentWeek}>
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : null}

      {notice ? (
        <div
          className="rounded-2xl border border-gravy-gold/25 bg-gravy-gold/10 px-4 py-3 text-sm text-gravy-brown shadow-subtle"
          role="status"
        >
          {notice}
        </div>
      ) : null}

      {recipes.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center shadow-subtle">
          <Badge variant="terracotta">Recipes needed</Badge>
          <h2 className="mt-4 text-xl font-semibold text-gravy-charcoal">Add recipes before planning</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Your planner pulls from saved recipes so the shopping list can use the same ingredient
            data later.
          </p>
          <Link className={cn(buttonVariants(), "mt-6 gap-2 rounded-xl")} href="/recipes/new">
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Create Recipe
          </Link>
        </div>
      ) : null}

      {plans.length === 0 && !isLoadingWeek && recipes.length > 0 ? (
        <EmptyState
          title="Start your week with a plan."
          description="Add recipes to build your meal plan."
          actionLabel="Browse Recipes"
          actionHref="/recipes"
        />
      ) : null}

      <div className={cn("space-y-4 transition", isLoadingWeek && "opacity-60")}>
        {isLoadingWeek ? (
          <div
            className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm font-medium text-muted-foreground shadow-subtle"
            role="status"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            Loading week
          </div>
        ) : null}

        <div className="hidden grid-cols-7 gap-4 lg:grid">
          {weekDays.map((day) => {
            const dateKey = formatDateKey(day);
            const dayPlans = groupedPlans[dateKey] ?? {};

            return (
              <section key={dateKey} className="min-w-0 space-y-3">
                <div
                  className={cn(
                    "rounded-2xl border bg-card px-3 py-3 shadow-subtle",
                    isTodayKey(dateKey) && "border-primary bg-primary/10",
                  )}
                >
                  <p className="text-xs font-medium uppercase text-muted-foreground">{formatDayName(day)}</p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <h3 className="text-2xl font-semibold text-gravy-charcoal">{formatDayNumber(day)}</h3>
                    {isTodayKey(dateKey) ? (
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                        Today
                      </span>
                    ) : null}
                  </div>
                </div>

                {MEAL_TYPES.map((mealType) => (
                  <MealSlot
                    key={`${dateKey}-${mealType}`}
                    dateKey={dateKey}
                    isRemoving={removingPlanId === dayPlans[mealType]?.id}
                    mealType={mealType}
                    plan={dayPlans[mealType]}
                    onAdd={openAddMeal}
                    onRemove={handleRemoveMeal}
                  />
                ))}
              </section>
            );
          })}
        </div>

        <div className="space-y-4 lg:hidden">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" aria-label="Week days">
            {weekDays.map((day) => {
              const dateKey = formatDateKey(day);
              const isSelected = dateKey === activeDayKey;
              const dayPlans = groupedPlans[dateKey] ?? {};
              const plannedForDay = MEAL_TYPES.filter((mealType) => dayPlans[mealType]).length;

              return (
                <button
                  key={dateKey}
                  aria-pressed={isSelected}
                  className={cn(
                    "min-w-[92px] rounded-2xl border px-3 py-3 text-left shadow-subtle transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-gravy-charcoal",
                  )}
                  type="button"
                  onClick={() => setActiveDateKey(dateKey)}
                >
                  <span className="block text-xs font-semibold">{formatDayName(day)}</span>
                  <span className="mt-1 block text-xl font-semibold">{formatDayNumber(day)}</span>
                  <span
                    className={cn(
                      "mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      isSelected ? "bg-card/20 text-white" : "bg-gravy-gold/10 text-gravy-brown",
                    )}
                  >
                    {plannedForDay}/3 meals
                  </span>
                </button>
              );
            })}
          </div>

          <section className="space-y-3">
            {MEAL_TYPES.map((mealType) => (
              <MealSlot
                key={`${activeDayKey}-${mealType}`}
                dateKey={activeDayKey}
                isRemoving={removingPlanId === groupedPlans[activeDayKey]?.[mealType]?.id}
                mealType={mealType}
                plan={groupedPlans[activeDayKey]?.[mealType]}
                onAdd={openAddMeal}
                onRemove={handleRemoveMeal}
              />
            ))}
          </section>
        </div>
      </div>

      <AddMealDialog
        key={dialogState ? `${dialogState.dateKey}-${dialogState.mealType}` : "closed"}
        initialDate={dialogState?.dateKey}
        initialMealType={dialogState?.mealType}
        isOpen={Boolean(dialogState)}
        recipes={recipes}
        userId={userId}
        onMealAdded={handleMealAdded}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDialogState(null);
          }
        }}
      />

      {recipes.length > 0 ? (
        <div className="fixed inset-x-4 bottom-[calc(5.8rem+env(safe-area-inset-bottom))] z-30 lg:hidden">
          <Button className="h-11 w-full rounded-xl" type="button" onClick={() => openAddMeal(activeDayKey, "Dinner")}>
            <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add Meal
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function getDefaultActiveDate(weekStartKey: string) {
  const todayKey = formatDateKey(new Date());
  const weekEndKey = getWeekEndKey(weekStartKey);

  return todayKey >= weekStartKey && todayKey <= weekEndKey ? todayKey : weekStartKey;
}
