"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Plus,
  RefreshCcw,
  ShoppingBasket,
} from "lucide-react";

import { AddShoppingItemForm } from "@/components/shopping-list/add-shopping-item-form";
import { GenerateShoppingListButton } from "@/components/shopping-list/generate-shopping-list-button";
import { ShoppingCategorySection } from "@/components/shopping-list/shopping-category-section";
import { ShoppingListItem as ShoppingListItemCard } from "@/components/shopping-list/shopping-list-item";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { CategorySection } from "@/components/ui/category-section";
import { EmptyState } from "@/components/ui/empty-state";
import {
  addDays,
  formatDateKey,
  formatWeekRange,
  getWeekEndKey,
  getWeekStartKey,
  parseDateKey,
} from "@/lib/meal-plans";
import { parseIngredients } from "@/lib/recipes";
import {
  combineIngredients,
  groupShoppingItemsByCategory,
  sortShoppingListItems,
} from "@/lib/shopping-list";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { MealPlanWithRecipe } from "@/types/meal-plans";
import {
  SHOPPING_CATEGORIES,
  type ShoppingListItem,
  type ShoppingListItemInsert,
} from "@/types/shopping-list";

type ShoppingListPageProps = {
  initialItems: ShoppingListItem[];
  initialMealPlanCount: number;
  initialWeekStartKey: string;
  userId: string;
};

type ShoppingWeekData = {
  items: ShoppingListItem[];
  mealPlanCount: number;
};

const emptyShoppingItems: ShoppingListItem[] = [];

export function ShoppingListPage({
  initialItems,
  initialMealPlanCount,
  initialWeekStartKey,
  userId,
}: ShoppingListPageProps) {
  const [weekStartKey, setWeekStartKey] = useState(initialWeekStartKey);
  const [weekDataByWeek, setWeekDataByWeek] = useState<Record<string, ShoppingWeekData>>({
    [initialWeekStartKey]: {
      items: [...initialItems].sort(sortShoppingListItems),
      mealPlanCount: initialMealPlanCount,
    },
  });
  const [busyItemIds, setBusyItemIds] = useState<Set<string>>(new Set());
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"aisle" | "recipe">("aisle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlightWeeks = useRef(new Set<string>());

  const weekData = weekDataByWeek[weekStartKey];
  const items = weekData?.items ?? emptyShoppingItems;
  const mealPlanCount = weekData?.mealPlanCount ?? 0;
  const checkedCount = items.filter((item) => item.checked).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
  const groupedItems = useMemo(() => groupShoppingItemsByCategory(items), [items]);
  const visibleCategories = SHOPPING_CATEGORIES.filter(
    (category) => groupedItems[category].length > 0,
  );
  const groupedBySource = useMemo(() => {
    return items.reduce<Record<string, ShoppingListItem[]>>((groups, item) => {
      const key = item.source === "meal_plan" ? "Meal Plan" : "Manual";
      groups[key] = [...(groups[key] ?? []), item];
      return groups;
    }, {});
  }, [items]);

  useEffect(() => {
    if (weekDataByWeek[weekStartKey] || inFlightWeeks.current.has(weekStartKey)) {
      return;
    }

    let shouldIgnore = false;
    inFlightWeeks.current.add(weekStartKey);
    setIsLoadingWeek(true);
    setError(null);
    setNotice(null);

    async function loadWeek() {
      try {
        const nextWeekData = await fetchShoppingWeekData(userId, weekStartKey);

        if (shouldIgnore) {
          return;
        }

        setWeekDataByWeek((currentData) => ({
          ...currentData,
          [weekStartKey]: nextWeekData,
        }));
      } catch (loadError) {
        if (!shouldIgnore) {
          setError(getErrorMessage(loadError, "Shopping list data could not be loaded."));
        }
      } finally {
        if (!shouldIgnore) {
          setIsLoadingWeek(false);
          inFlightWeeks.current.delete(weekStartKey);
        }
      }
    }

    void loadWeek();

    return () => {
      shouldIgnore = true;
    };
  }, [weekDataByWeek, weekStartKey, userId]);

  function moveWeek(direction: "previous" | "next") {
    const nextWeekStartKey = formatDateKey(
      addDays(parseDateKey(weekStartKey), direction === "next" ? 7 : -7),
    );
    setWeekStartKey(nextWeekStartKey);
    setError(null);
    setNotice(null);
  }

  function returnToCurrentWeek() {
    setWeekStartKey(getWeekStartKey(new Date()));
    setError(null);
    setNotice(null);
  }

  function reloadCurrentWeek() {
    setError(null);
    setNotice(null);
    setWeekDataByWeek((currentData) => {
      const nextData = { ...currentData };
      delete nextData[weekStartKey];
      return nextData;
    });
  }

  function updateWeekItems(
    targetWeekStartKey: string,
    updater: (currentItems: ShoppingListItem[]) => ShoppingListItem[],
  ) {
    setWeekDataByWeek((currentData) => {
      const currentWeekData = currentData[targetWeekStartKey] ?? {
        items: [],
        mealPlanCount: 0,
      };

      return {
        ...currentData,
        [targetWeekStartKey]: {
          ...currentWeekData,
          items: updater(currentWeekData.items).sort(sortShoppingListItems),
        },
      };
    });
  }

  function setItemBusy(itemId: string, isBusy: boolean) {
    setBusyItemIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (isBusy) {
        nextIds.add(itemId);
      } else {
        nextIds.delete(itemId);
      }

      return nextIds;
    });
  }

  async function handleCheckedChange(item: ShoppingListItem, checked: boolean) {
    const targetWeekStartKey = item.week_start ?? weekStartKey;

    setItemBusy(item.id, true);
    setError(null);
    setNotice(null);
    updateWeekItems(targetWeekStartKey, (currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, checked } : currentItem,
      ),
    );

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("shopping_list_items")
      .update({ checked })
      .eq("id", item.id)
      .eq("user_id", userId);

    if (updateError) {
      updateWeekItems(targetWeekStartKey, (currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id ? { ...currentItem, checked: item.checked } : currentItem,
        ),
      );
      setError(updateError.message);
    }

    setItemBusy(item.id, false);
  }

  async function handleDeleteItem(item: ShoppingListItem) {
    const targetWeekStartKey = item.week_start ?? weekStartKey;

    setItemBusy(item.id, true);
    setError(null);
    setNotice(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("id", item.id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
      setItemBusy(item.id, false);
      return;
    }

    updateWeekItems(targetWeekStartKey, (currentItems) =>
      currentItems.filter((currentItem) => currentItem.id !== item.id),
    );
    setNotice(`${item.name} was removed from the list.`);
    setItemBusy(item.id, false);
  }

  function handleItemAdded(item: ShoppingListItem) {
    const targetWeekStartKey = item.week_start ?? weekStartKey;

    updateWeekItems(targetWeekStartKey, (currentItems) => [...currentItems, item]);
    setNotice(`${item.name} was added to this week's list.`);
  }

  async function handleClearCheckedItems() {
    if (checkedCount === 0) {
      return;
    }

    setIsClearing(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();
    const { error: clearError } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("user_id", userId)
      .eq("week_start", weekStartKey)
      .eq("checked", true);

    if (clearError) {
      setError(clearError.message);
      setIsClearing(false);
      return;
    }

    updateWeekItems(weekStartKey, (currentItems) => currentItems.filter((item) => !item.checked));
    setNotice("Checked items were cleared.");
    setIsClearing(false);
  }

  async function handleGenerateFromMealPlan() {
    setIsGenerating(true);
    setError(null);
    setNotice(null);

    try {
      const supabase = createClient();
      const { data: mealPlans, error: planError } = await supabase
        .from("meal_plans")
        .select("*, recipe:recipes(*)")
        .eq("user_id", userId)
        .gte("planned_date", weekStartKey)
        .lte("planned_date", getWeekEndKey(weekStartKey))
        .order("planned_date", { ascending: true })
        .order("meal_type", { ascending: true });

      if (planError) {
        throw new Error(planError.message);
      }

      const plans = (mealPlans ?? []) as MealPlanWithRecipe[];
      setWeekDataByWeek((currentData) => ({
        ...currentData,
        [weekStartKey]: {
          items: currentData[weekStartKey]?.items ?? [],
          mealPlanCount: plans.length,
        },
      }));

      const { error: deleteError } = await supabase
        .from("shopping_list_items")
        .delete()
        .eq("user_id", userId)
        .eq("week_start", weekStartKey)
        .eq("source", "meal_plan");

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      if (plans.length === 0) {
        const nextWeekData = await fetchShoppingWeekData(userId, weekStartKey);
        setWeekDataByWeek((currentData) => ({
          ...currentData,
          [weekStartKey]: nextWeekData,
        }));
        setNotice("No meals planned for this week yet. Manual items were kept.");
        return;
      }

      const ingredients = plans.flatMap((plan) =>
        plan.recipe ? parseIngredients(plan.recipe.ingredients) : [],
      );
      const generatedItems = combineIngredients(ingredients);

      if (generatedItems.length > 0) {
        const payload: ShoppingListItemInsert[] = generatedItems.map((item) => ({
          user_id: userId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          checked: false,
          source: "meal_plan",
          week_start: weekStartKey,
        }));
        const { error: insertError } = await supabase.from("shopping_list_items").insert(payload);

        if (insertError) {
          throw new Error(insertError.message);
        }
      }

      const nextWeekData = await fetchShoppingWeekData(userId, weekStartKey);
      setWeekDataByWeek((currentData) => ({
        ...currentData,
        [weekStartKey]: nextWeekData,
      }));
      setNotice(
        generatedItems.length > 0
          ? `Generated ${generatedItems.length} grocery item${
              generatedItems.length === 1 ? "" : "s"
            } from your meal plan. Manual items were kept.`
          : "Planned meals do not have ingredients yet. Manual items were kept.",
      );
    } catch (generateError) {
      setError(getErrorMessage(generateError, "Shopping list could not be generated."));
    } finally {
      setIsGenerating(false);
    }
  }

  const isBusy = isLoadingWeek || isGenerating || isClearing;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="blue">Weekly groceries</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-gravy-charcoal sm:text-4xl">
            Shopping List
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            {formatWeekRange(weekStartKey)} groceries from planned meals, with room for the extras
            real life always remembers late.
          </p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-subtle">
          <ShoppingBasket className="h-7 w-7" aria-hidden="true" />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4 shadow-subtle">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items total</p>
          <p className="mt-2 text-2xl font-semibold text-gravy-charcoal">{totalCount}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-subtle">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checked</p>
          <p className="mt-2 text-2xl font-semibold text-gravy-charcoal">{checkedCount}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-subtle">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Planned meals</p>
          <p className="mt-2 text-2xl font-semibold text-gravy-charcoal">{mealPlanCount}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-subtle">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progress</p>
          <p className="mt-2 text-2xl font-semibold text-gravy-charcoal">{progressPercent}%</p>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border bg-card p-4 shadow-subtle lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center sm:p-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">Current week</Badge>
            <span className="text-sm font-medium text-muted-foreground">
              {checkedCount} of {totalCount} items checked
            </span>
          </div>
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {totalCount > 0
                ? `${progressPercent}% complete for ${formatWeekRange(weekStartKey)}`
                : "No items yet for this week."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <div className="flex gap-2">
            <Button
              aria-label="Previous week"
              className="h-11 w-11 rounded-xl px-0"
              disabled={isBusy}
              title="Previous week"
              type="button"
              variant="secondary"
              onClick={() => moveWeek("previous")}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button
              className="h-11 gap-2 rounded-xl"
              disabled={isBusy}
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
              disabled={isBusy}
              title="Next week"
              type="button"
              variant="secondary"
              onClick={() => moveWeek("next")}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
          <GenerateShoppingListButton
            disabled={isBusy}
            isGenerating={isGenerating}
            onGenerate={handleGenerateFromMealPlan}
          />
          <Button
            className="h-11 gap-2 rounded-xl"
            disabled={isBusy}
            type="button"
            variant="secondary"
            onClick={() => setIsAddItemOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Item
          </Button>
          <Button
            className="h-11 gap-2 rounded-xl text-gravy-brown hover:bg-gravy-brown/10 hover:text-gravy-brown"
            disabled={isBusy || checkedCount === 0}
            type="button"
            variant="ghost"
            onClick={handleClearCheckedItems}
          >
            <Eraser className="h-4 w-4" aria-hidden="true" />
            {isClearing ? "Clearing..." : "Clear Checked"}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-2 shadow-subtle">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={viewMode === "aisle"}
            className={cn(
              "h-10 rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              viewMode === "aisle"
                ? "bg-primary text-primary-foreground"
                : "bg-gravy-paper text-muted-foreground",
            )}
            onClick={() => setViewMode("aisle")}
          >
            By Aisle
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "recipe"}
            className={cn(
              "h-10 rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              viewMode === "recipe"
                ? "bg-primary text-primary-foreground"
                : "bg-gravy-paper text-muted-foreground",
            )}
            onClick={() => setViewMode("recipe")}
          >
            By Recipe
          </button>
        </div>
      </section>

      {error ? (
        <div
          className="flex flex-col gap-3 rounded-2xl border border-gravy-brown/30 bg-gravy-brown/10 px-4 py-3 text-sm leading-6 text-gravy-brown shadow-subtle sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <span>{error}</span>
          <Button className="h-9 gap-2 self-start" type="button" variant="secondary" onClick={reloadCurrentWeek}>
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : null}

      {notice ? (
        <div
          className="rounded-2xl border border-gravy-gold/25 bg-gravy-gold/10 px-4 py-3 text-sm leading-6 text-gravy-brown shadow-subtle"
          role="status"
        >
          {notice}
        </div>
      ) : null}

      {isLoadingWeek && !weekData ? (
        <ShoppingListSkeleton />
      ) : totalCount === 0 ? (
        <EmptyShoppingList
          mealPlanCount={mealPlanCount}
          onGenerate={handleGenerateFromMealPlan}
          isGenerating={isGenerating}
          isBusy={isBusy}
          onAddManual={() => setIsAddItemOpen(true)}
        />
      ) : (
        <div className={cn("space-y-7 transition", isBusy && "opacity-75")}>
          {viewMode === "aisle"
            ? visibleCategories.map((category) => (
                <ShoppingCategorySection
                  key={category}
                  category={category}
                  items={groupedItems[category]}
                  busyItemIds={busyItemIds}
                  onCheckedChange={handleCheckedChange}
                  onDelete={handleDeleteItem}
                />
              ))
            : Object.entries(groupedBySource).map(([source, sourceItems]) => (
                <CategorySection key={source} title={source} count={sourceItems.length}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {sourceItems.map((item) => (
                      <ShoppingListItemCard
                        key={item.id}
                        item={item}
                        isBusy={busyItemIds.has(item.id)}
                        onCheckedChange={handleCheckedChange}
                        onDelete={handleDeleteItem}
                      />
                    ))}
                  </div>
                </CategorySection>
              ))}

          <section className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3 shadow-subtle">
            <p className="text-sm font-semibold text-gravy-charcoal">{totalCount} items</p>
            <div className="flex items-center gap-2">
              <Link className={cn(buttonVariants({ variant: "secondary" }), "h-9 rounded-lg")} href="/recipes">
                View Recipes
              </Link>
              <Button className="h-9 rounded-lg" type="button" onClick={() => setIsAddItemOpen(true)}>
                Add Item
              </Button>
            </div>
          </section>
        </div>
      )}

      <AddShoppingItemForm
        isOpen={isAddItemOpen}
        userId={userId}
        weekStartKey={weekStartKey}
        onItemAdded={handleItemAdded}
        onOpenChange={setIsAddItemOpen}
      />
    </div>
  );
}

async function fetchShoppingWeekData(
  userId: string,
  weekStartKey: string,
): Promise<ShoppingWeekData> {
  const supabase = createClient();
  const [itemsResponse, plansResponse] = await Promise.all([
    supabase
      .from("shopping_list_items")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", weekStartKey)
      .order("checked", { ascending: true })
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("meal_plans")
      .select("id")
      .eq("user_id", userId)
      .gte("planned_date", weekStartKey)
      .lte("planned_date", getWeekEndKey(weekStartKey)),
  ]);

  if (itemsResponse.error) {
    throw new Error(itemsResponse.error.message);
  }

  if (plansResponse.error) {
    throw new Error(plansResponse.error.message);
  }

  return {
    items: ((itemsResponse.data ?? []) as ShoppingListItem[]).sort(sortShoppingListItems),
    mealPlanCount: plansResponse.data?.length ?? 0,
  };
}

function EmptyShoppingList({
  mealPlanCount,
  isBusy,
  isGenerating,
  onGenerate,
  onAddManual,
}: {
  mealPlanCount: number;
  isBusy: boolean;
  isGenerating: boolean;
  onGenerate: () => Promise<void>;
  onAddManual: () => void;
}) {
  if (mealPlanCount === 0) {
    return (
      <EmptyState
        title="Your shopping list is empty."
        description="Add meals to generate your list."
        actionLabel="Go to Meal Planner"
        actionHref="/meal-planner"
      />
    );
  }

  return (
    <section className="rounded-2xl border border-dashed bg-card p-8 text-center shadow-subtle">
      <h2 className="text-xl font-semibold text-gravy-charcoal">Your shopping list is empty.</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        Add meals to generate your list.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <GenerateShoppingListButton
          disabled={isBusy}
          isGenerating={isGenerating}
          onGenerate={onGenerate}
        />
        <Button className="h-11 gap-2 rounded-xl" disabled={isBusy} type="button" variant="secondary" onClick={onAddManual}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Item
        </Button>
      </div>
    </section>
  );
}

function ShoppingListSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((sectionIndex) => (
        <section key={sectionIndex} className="space-y-3">
          <div className="h-7 w-44 animate-pulse rounded-full bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((itemIndex) => (
              <div
                key={`${sectionIndex}-${itemIndex}`}
                className="rounded-2xl border bg-card p-4 shadow-subtle"
              >
                <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] gap-3">
                  <div className="h-12 w-12 animate-pulse rounded-xl bg-muted" />
                  <div className="space-y-3">
                    <div className="h-5 w-40 animate-pulse rounded-full bg-muted" />
                    <div className="h-4 w-28 animate-pulse rounded-full bg-muted" />
                  </div>
                  <div className="h-12 w-12 animate-pulse rounded-xl bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}
