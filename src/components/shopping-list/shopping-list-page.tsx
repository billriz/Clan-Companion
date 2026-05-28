"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eraser,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCcw,
  ShoppingBasket,
} from "lucide-react";

import { AddShoppingItemForm } from "@/components/shopping-list/add-shopping-item-form";
import { GenerateShoppingListButton } from "@/components/shopping-list/generate-shopping-list-button";
import { ShoppingCategorySection } from "@/components/shopping-list/shopping-category-section";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { filterExportableShoppingItems, flagLowConfidenceItems } from "@/lib/instacart/line-items";
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
  initialShoppingListId: string;
  preferredGroceryProvider: string;
  preferredGroceryStoreName: string;
  preferredGroceryStoreNotes: string;
  userId: string;
};

type ShoppingWeekData = {
  shoppingListId: string;
  items: ShoppingListItem[];
  mealPlanCount: number;
};

type GroceryPreferenceForm = {
  provider: string;
  storeName: string;
  storeNotes: string;
};

type InstacartExportResult = {
  instacartUrl: string;
  exportId: string;
  lowConfidenceItems: Array<{
    itemId: string;
    name: string;
    reasons: string[];
  }>;
};

type InstacartExportResponse = {
  success: boolean;
  instacartUrl?: string;
  exportId?: string;
  error?: string;
  lowConfidenceItems?: Array<{
    itemId: string;
    name: string;
    reasons: string[];
  }>;
};

const emptyShoppingItems: ShoppingListItem[] = [];

export function ShoppingListPage({
  initialItems,
  initialMealPlanCount,
  initialWeekStartKey,
  initialShoppingListId,
  preferredGroceryProvider,
  preferredGroceryStoreName,
  preferredGroceryStoreNotes,
  userId,
}: ShoppingListPageProps) {
  const [weekStartKey, setWeekStartKey] = useState(initialWeekStartKey);
  const [weekDataByWeek, setWeekDataByWeek] = useState<Record<string, ShoppingWeekData>>({
    [initialWeekStartKey]: {
      shoppingListId: initialShoppingListId,
      items: [...initialItems].sort(sortShoppingListItems),
      mealPlanCount: initialMealPlanCount,
    },
  });
  const [exportResultByWeek, setExportResultByWeek] = useState<Record<string, InstacartExportResult>>({});
  const [busyItemIds, setBusyItemIds] = useState<Set<string>>(new Set());
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isPreferenceEditing, setIsPreferenceEditing] = useState(false);
  const [isSavingPreference, setIsSavingPreference] = useState(false);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const [savedPreference, setSavedPreference] = useState<GroceryPreferenceForm>({
    provider: preferredGroceryProvider,
    storeName: preferredGroceryStoreName,
    storeNotes: preferredGroceryStoreNotes,
  });
  const [preferenceForm, setPreferenceForm] = useState<GroceryPreferenceForm>({
    provider: preferredGroceryProvider,
    storeName: preferredGroceryStoreName,
    storeNotes: preferredGroceryStoreNotes,
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inFlightWeeks = useRef(new Set<string>());

  const weekData = weekDataByWeek[weekStartKey];
  const currentExportResult = exportResultByWeek[weekStartKey] ?? null;
  const items = weekData?.items ?? emptyShoppingItems;
  const shoppingListId = weekData?.shoppingListId ?? "";
  const mealPlanCount = weekData?.mealPlanCount ?? 0;
  const checkedCount = items.filter((item) => item.checked).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
  const exportableItems = useMemo(() => filterExportableShoppingItems(items), [items]);
  const lowConfidenceItems = useMemo(() => flagLowConfidenceItems(exportableItems), [exportableItems]);
  const preferredStoreLabel = `${savedPreference.storeName.trim() || "Woodman's"} via ${formatProviderLabel(
    savedPreference.provider,
  )}`;
  const groupedItems = useMemo(() => groupShoppingItemsByCategory(items), [items]);
  const visibleCategories = SHOPPING_CATEGORIES.filter(
    (category) => groupedItems[category].length > 0,
  );

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
    setCopyStatus("idle");
    setError(null);
    setNotice(null);
  }

  function returnToCurrentWeek() {
    setWeekStartKey(getWeekStartKey(new Date()));
    setCopyStatus("idle");
    setError(null);
    setNotice(null);
  }

  function reloadCurrentWeek() {
    setError(null);
    setNotice(null);
    setCopyStatus("idle");
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
        shoppingListId: "",
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
    setExportResultByWeek((currentResults) => {
      if (!currentResults[targetWeekStartKey]) {
        return currentResults;
      }

      const nextResults = { ...currentResults };
      delete nextResults[targetWeekStartKey];
      return nextResults;
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
          shoppingListId: currentData[weekStartKey]?.shoppingListId ?? shoppingListId,
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

  async function handleExportToInstacart() {
    if (!shoppingListId) {
      setError("Shopping list metadata is missing. Reload and try again.");
      return;
    }

    if (exportableItems.length === 0) {
      setError("This shopping list has no items to export.");
      return;
    }

    setIsExporting(true);
    setCopyStatus("idle");
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/integrations/instacart/export-shopping-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shoppingListId }),
      });

      const payload = (await response.json().catch(() => ({}))) as InstacartExportResponse;

      if (!response.ok || !payload.success || !payload.instacartUrl || !payload.exportId) {
        setError(payload.error ?? "We could not create your Instacart list right now.");
        return;
      }

      setExportResultByWeek((currentResults) => ({
        ...currentResults,
        [weekStartKey]: {
          instacartUrl: payload.instacartUrl as string,
          exportId: payload.exportId as string,
          lowConfidenceItems: payload.lowConfidenceItems ?? [],
        },
      }));
      setNotice("Your Instacart shopping list is ready.");
    } catch {
      setError("We could not create your Instacart list right now.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleCopyInstacartLink() {
    if (!currentExportResult?.instacartUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(currentExportResult.instacartUrl);
      setCopyStatus("success");
      setNotice("Instacart link copied.");
    } catch {
      setCopyStatus("error");
      setError("Could not copy the Instacart link.");
    }
  }

  async function handleSavePreference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanProvider = preferenceForm.provider.trim().toLowerCase();
    const cleanStoreName = preferenceForm.storeName.trim();

    if (!cleanProvider) {
      setPreferenceError("Provider is required.");
      return;
    }

    if (!cleanStoreName) {
      setPreferenceError("Store name is required.");
      return;
    }

    setIsSavingPreference(true);
    setPreferenceError(null);

    const supabase = createClient();
    const { error: saveError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        preferred_grocery_provider: cleanProvider,
        preferred_grocery_store_name: cleanStoreName,
        preferred_grocery_store_notes: preferenceForm.storeNotes.trim() || null,
      },
      {
        onConflict: "id",
      },
    );

    if (saveError) {
      setPreferenceError(saveError.message);
      setIsSavingPreference(false);
      return;
    }

    setSavedPreference((currentForm) => ({
      ...currentForm,
      provider: cleanProvider,
      storeName: cleanStoreName,
      storeNotes: currentForm.storeNotes.trim(),
    }));
    setPreferenceForm((currentForm) => ({
      ...currentForm,
      provider: cleanProvider,
      storeName: cleanStoreName,
      storeNotes: currentForm.storeNotes.trim(),
    }));
    setIsSavingPreference(false);
    setIsPreferenceEditing(false);
    setNotice("Grocery preferences saved.");
  }

  function handleCancelPreferenceEdit() {
    setPreferenceForm({ ...savedPreference });
    setPreferenceError(null);
    setIsPreferenceEditing(false);
  }

  const isBusy = isLoadingWeek || isGenerating || isClearing || isExporting;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="blue">Weekly groceries</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-plate-charcoal sm:text-4xl">
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
        <div className="rounded-2xl border bg-white p-4 shadow-subtle">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items total</p>
          <p className="mt-2 text-2xl font-semibold text-plate-charcoal">{totalCount}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-subtle">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checked</p>
          <p className="mt-2 text-2xl font-semibold text-plate-charcoal">{checkedCount}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-subtle">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Planned meals</p>
          <p className="mt-2 text-2xl font-semibold text-plate-charcoal">{mealPlanCount}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-subtle">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progress</p>
          <p className="mt-2 text-2xl font-semibold text-plate-charcoal">{progressPercent}%</p>
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border bg-white p-4 shadow-subtle lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center sm:p-5">
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
            className="h-11 gap-2 rounded-xl text-plate-terracotta hover:bg-plate-terracotta/10 hover:text-plate-terracotta"
            disabled={isBusy || checkedCount === 0}
            type="button"
            variant="ghost"
            onClick={handleClearCheckedItems}
          >
            <Eraser className="h-4 w-4" aria-hidden="true" />
            {isClearing ? "Clearing..." : "Clear Checked"}
          </Button>
          <Button
            className="h-11 gap-2 rounded-xl"
            disabled={isBusy || exportableItems.length === 0 || !shoppingListId}
            type="button"
            onClick={handleExportToInstacart}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Exporting...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Export to Instacart
              </>
            )}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border bg-white px-4 py-4 text-sm text-muted-foreground shadow-subtle">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>
            Preferred store: <span className="font-medium text-plate-charcoal">{preferredStoreLabel}</span>
          </p>
          {isPreferenceEditing ? null : (
            <Button
              className="h-9 rounded-xl"
              type="button"
              variant="secondary"
              onClick={() => {
                setPreferenceForm({ ...savedPreference });
                setPreferenceError(null);
                setIsPreferenceEditing(true);
              }}
            >
              Edit preference
            </Button>
          )}
        </div>

        {isPreferenceEditing ? (
          <form className="mt-4 grid gap-3" onSubmit={handleSavePreference}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="groceryProvider">Provider</Label>
                <Input
                  id="groceryProvider"
                  value={preferenceForm.provider}
                  placeholder="instacart"
                  disabled={isSavingPreference}
                  onChange={(event) =>
                    setPreferenceForm((currentForm) => ({
                      ...currentForm,
                      provider: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groceryStoreName">Store name</Label>
                <Input
                  id="groceryStoreName"
                  value={preferenceForm.storeName}
                  placeholder="Woodman's"
                  disabled={isSavingPreference}
                  onChange={(event) =>
                    setPreferenceForm((currentForm) => ({
                      ...currentForm,
                      storeName: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="groceryStoreNotes">Store notes (optional)</Label>
              <Textarea
                id="groceryStoreNotes"
                value={preferenceForm.storeNotes}
                rows={2}
                placeholder="Any preference notes for your household"
                disabled={isSavingPreference}
                onChange={(event) =>
                  setPreferenceForm((currentForm) => ({
                    ...currentForm,
                    storeNotes: event.target.value,
                  }))
                }
              />
            </div>
            {preferenceError ? (
              <div
                className="rounded-2xl border border-plate-terracotta/30 bg-plate-terracotta/10 px-4 py-3 text-sm text-plate-terracotta"
                role="alert"
              >
                {preferenceError}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button className="h-10 rounded-xl" disabled={isSavingPreference} type="submit">
                {isSavingPreference ? "Saving..." : "Save preference"}
              </Button>
              <Button
                className="h-10 rounded-xl"
                disabled={isSavingPreference}
                type="button"
                variant="secondary"
                onClick={handleCancelPreferenceEdit}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </section>

      {error ? (
        <div
          className="flex flex-col gap-3 rounded-2xl border border-plate-terracotta/30 bg-plate-terracotta/10 px-4 py-3 text-sm leading-6 text-plate-terracotta shadow-subtle sm:flex-row sm:items-center sm:justify-between"
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
          className="rounded-2xl border border-plate-blue/25 bg-plate-blue/10 px-4 py-3 text-sm leading-6 text-plate-blue shadow-subtle"
          role="status"
        >
          {notice}
        </div>
      ) : null}

      {lowConfidenceItems.length > 0 ? (
        <section className="rounded-2xl border border-plate-terracotta/30 bg-plate-terracotta/10 p-4 text-sm text-plate-charcoal shadow-subtle">
          <h2 className="text-sm font-semibold">Review before export</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {lowConfidenceItems.length} item{lowConfidenceItems.length === 1 ? "" : "s"} may be harder for Instacart to match.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {lowConfidenceItems.slice(0, 4).map((item) => (
              <li key={item.itemId} className="rounded-xl bg-white px-3 py-2">
                <span className="font-medium">{item.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{item.reasons.join(" ")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {currentExportResult ? (
        <section className="rounded-2xl border border-primary/30 bg-primary/10 p-5 shadow-subtle">
          <h2 className="text-lg font-semibold text-plate-charcoal">
            Your Instacart shopping list is ready
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Open Instacart to review matches, choose your store, add items to cart, and check out.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              className={cn(buttonVariants(), "h-10 gap-2 rounded-xl")}
              href={currentExportResult.instacartUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Open in Instacart
            </a>
            <Button
              className="h-10 gap-2 rounded-xl"
              type="button"
              variant="secondary"
              onClick={handleCopyInstacartLink}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copyStatus === "success" ? "Copied" : "Copy link"}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Final prices, availability, substitutions, and checkout are handled by Instacart.
          </p>
        </section>
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
          {visibleCategories.map((category) => (
            <ShoppingCategorySection
              key={category}
              category={category}
              items={groupedItems[category]}
              busyItemIds={busyItemIds}
              onCheckedChange={handleCheckedChange}
              onDelete={handleDeleteItem}
            />
          ))}
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
  const [itemsResponse, plansResponse, shoppingListResponse] = await Promise.all([
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
    supabase
      .from("shopping_lists")
      .upsert(
        {
          user_id: userId,
          week_start: weekStartKey,
        },
        {
          onConflict: "user_id,week_start",
        },
      )
      .select("id")
      .single(),
  ]);

  if (itemsResponse.error) {
    throw new Error(itemsResponse.error.message);
  }

  if (plansResponse.error) {
    throw new Error(plansResponse.error.message);
  }

  if (shoppingListResponse.error || !shoppingListResponse.data?.id) {
    throw new Error(shoppingListResponse.error?.message ?? "Shopping list metadata could not be loaded.");
  }

  return {
    shoppingListId: shoppingListResponse.data.id,
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
      <section className="rounded-2xl border border-dashed bg-white p-8 text-center shadow-subtle">
        <Badge variant="terracotta">No meals planned</Badge>
        <h2 className="mt-4 text-xl font-semibold text-plate-charcoal">
          No meals planned for this week yet.
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          Add recipes to the meal planner first, then come back to turn those ingredients into a
          grocery run.
        </p>
        <Link className={cn(buttonVariants(), "mt-6 gap-2 rounded-xl")} href="/meal-planner">
          Go to Meal Planner
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-dashed bg-white p-8 text-center shadow-subtle">
      <Badge variant="default">Ready to build</Badge>
      <h2 className="mt-4 text-xl font-semibold text-plate-charcoal">Your shopping list is empty.</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        Generate a list from planned recipes for the current week, then add any household extras by
        hand.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <GenerateShoppingListButton
          disabled={isBusy}
          isGenerating={isGenerating}
          onGenerate={onGenerate}
        />
        <Button className="h-11 gap-2 rounded-xl" disabled={isBusy} type="button" variant="secondary" onClick={onAddManual}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Manual Item
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
                className="rounded-2xl border bg-white p-4 shadow-subtle"
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

function formatProviderLabel(provider: string) {
  const cleanProvider = provider.trim();

  if (!cleanProvider) {
    return "Instacart";
  }

  if (cleanProvider.toLowerCase() === "instacart") {
    return "Instacart";
  }

  return cleanProvider;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}
