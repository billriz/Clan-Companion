"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { CalendarPlus, Check, Clock3, Search, Utensils, X } from "lucide-react";

import { RecipeImagePlaceholder } from "@/components/recipes/recipe-image-placeholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import {
  MEAL_TYPES,
  formatDateKey,
  formatDayName,
  formatDayNumber,
  getWeekDays,
  getWeekStartKey,
  isMealType,
  parseDateKey,
} from "@/lib/meal-plans";
import { formatMinutes } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { MealPlanWithRecipe, MealType } from "@/types/meal-plans";
import type { Recipe } from "@/types/recipes";

type AddMealDialogProps = {
  isOpen: boolean;
  userId: string;
  recipes: Recipe[];
  initialDate?: string;
  initialMealType?: MealType;
  initialRecipeId?: string | null;
  onOpenChange: (isOpen: boolean) => void;
  onMealAdded?: (plan: MealPlanWithRecipe) => void;
};

export function AddMealDialog({
  isOpen,
  userId,
  recipes,
  initialDate,
  initialMealType = "Dinner",
  initialRecipeId,
  onOpenChange,
  onMealAdded,
}: AddMealDialogProps) {
  const initialSelectedDate = initialDate ?? formatDateKey(new Date());
  const initialSelectedMealType = isMealType(initialMealType) ? initialMealType : "Dinner";
  const initialSelectedRecipeId = initialRecipeId ?? recipes[0]?.id ?? null;

  const [selectedDate, setSelectedDate] = useState(initialSelectedDate);
  const [selectedMealType, setSelectedMealType] = useState<MealType>(initialSelectedMealType);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(
    initialSelectedRecipeId,
  );
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekDays = useMemo(() => {
    return getWeekDays(getWeekStartKey(parseDateKey(selectedDate)));
  }, [selectedDate]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        recipes
          .map((recipe) => recipe.category?.trim())
          .filter((category): category is string => Boolean(category)),
      ),
    ).sort((firstCategory, secondCategory) => firstCategory.localeCompare(secondCategory));
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return recipes.filter((recipe) => {
      const matchesCategory = activeCategory === "all" || recipe.category === activeCategory;
      const matchesQuery =
        !normalizedQuery ||
        [recipe.title, recipe.description, recipe.category, ...(recipe.tags ?? [])]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery));

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query, recipes]);

  async function handleAddMeal() {
    if (!selectedRecipeId) {
      setError("Choose a recipe first.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("meal_plans")
      .delete()
      .eq("user_id", userId)
      .eq("planned_date", selectedDate)
      .eq("meal_type", selectedMealType);

    if (deleteError) {
      setError(deleteError.message);
      setIsSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("meal_plans")
      .insert({
        user_id: userId,
        recipe_id: selectedRecipeId,
        planned_date: selectedDate,
        meal_type: selectedMealType,
      })
      .select("*, recipe:recipes(*)")
      .single();

    if (insertError) {
      setError(insertError.message);
      setIsSaving(false);
      return;
    }

    onMealAdded?.(data as MealPlanWithRecipe);
    setIsSaving(false);
    onOpenChange(false);
  }

  return (
    <ModalShell
      isOpen={isOpen}
      labelledBy="add-meal-dialog-title"
      describedBy="add-meal-dialog-description"
      panelClassName="max-h-[92vh] max-w-4xl"
      onClose={() => onOpenChange(false)}
    >
      <header className="flex items-start justify-between gap-4 border-b bg-white px-4 py-4 sm:px-6">
        <div>
          <Badge variant="blue">Meal planner</Badge>
          <h2 id="add-meal-dialog-title" className="mt-2 text-xl font-semibold text-plate-charcoal">
            Add Meal
          </h2>
          <p id="add-meal-dialog-description" className="mt-1 text-sm text-muted-foreground">
            Pick a day, meal type, and recipe.
          </p>
        </div>
        <Button
          aria-label="Close"
          className="h-10 w-10 rounded-xl px-0"
          type="button"
          variant="secondary"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
        <section className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-plate-charcoal">Day</h3>
              <Input
                aria-label="Plan date"
                className="h-10 w-40 rounded-xl bg-white"
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(event.target.value || formatDateKey(new Date()))
                }
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Pick day">
              {weekDays.map((day) => {
                const dateKey = formatDateKey(day);
                const isSelected = dateKey === selectedDate;

                return (
                  <button
                    key={dateKey}
                    aria-pressed={isSelected}
                    className={cn(
                      "min-w-20 rounded-2xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-subtle"
                        : "border-border bg-white text-muted-foreground hover:border-primary/50 hover:text-plate-charcoal",
                    )}
                    type="button"
                    onClick={() => setSelectedDate(dateKey)}
                  >
                    <span className="block text-xs font-medium">{formatDayName(day)}</span>
                    <span className="mt-1 block text-lg font-semibold">{formatDayNumber(day)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-plate-charcoal">Meal</h3>
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1" aria-label="Meal type">
              {MEAL_TYPES.map((mealType) => {
                const isSelected = mealType === selectedMealType;

                return (
                  <button
                    key={mealType}
                    aria-pressed={isSelected}
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground shadow-subtle"
                        : "border-border bg-white text-muted-foreground hover:border-primary/50 hover:text-plate-charcoal",
                    )}
                    type="button"
                    onClick={() => setSelectedMealType(mealType)}
                  >
                    {mealType}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Search recipes"
              className="h-12 rounded-xl bg-white pl-10"
              placeholder="Search recipes..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {categories.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Recipe categories">
              {["all", ...categories].map((category) => {
                const isSelected = category === activeCategory;

                return (
                  <button
                    key={category}
                    aria-pressed={isSelected}
                    className={cn(
                      "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "border-plate-blue bg-plate-blue text-white shadow-subtle"
                        : "border-plate-blue/25 bg-plate-blue/10 text-plate-blue hover:bg-plate-blue/15",
                    )}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                  >
                    {category === "all" ? "All" : category}
                  </button>
                );
              })}
            </div>
          ) : null}

          {filteredRecipes.length > 0 ? (
            <div className="grid max-h-[320px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {filteredRecipes.map((recipe) => {
                const isSelected = recipe.id === selectedRecipeId;

                return (
                  <button
                    key={recipe.id}
                    aria-pressed={isSelected}
                    className={cn(
                      "grid grid-cols-[76px_minmax(0,1fr)] gap-3 rounded-2xl border bg-white p-2 text-left shadow-subtle transition hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected && "border-primary bg-primary/10 ring-1 ring-primary",
                    )}
                    type="button"
                    onClick={() => setSelectedRecipeId(recipe.id)}
                  >
                    <div className="relative h-[76px] overflow-hidden rounded-xl bg-secondary">
                      {recipe.image_url ? (
                        <Image
                          fill
                          alt={recipe.title}
                          className="object-cover"
                          sizes="76px"
                          src={recipe.image_url}
                        />
                      ) : (
                        <RecipeImagePlaceholder iconClassName="h-6 w-6" />
                      )}
                    </div>
                    <div className="min-w-0 py-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="line-clamp-2 text-sm font-semibold leading-5 text-plate-charcoal">
                          {recipe.title}
                        </h4>
                        {isSelected ? (
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                            title="Selected"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        {formatMinutes(recipe.prep_time)}
                      </p>
                      <span className="mt-2 inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
                        {isSelected ? "Selected" : "Select"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed bg-white p-6 text-center shadow-subtle">
              <Utensils className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-plate-charcoal">No recipes found</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try another search or category.</p>
            </div>
          )}
        </section>

        {error ? (
          <div
            className="rounded-2xl border border-plate-terracotta/30 bg-plate-terracotta/10 px-4 py-3 text-sm text-plate-terracotta"
            role="alert"
          >
            {error}
          </div>
        ) : null}
      </div>

      <footer className="flex flex-col gap-2 border-t bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
        <Button className="h-11 rounded-xl" type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          className="h-11 gap-2 rounded-xl"
          disabled={isSaving || recipes.length === 0 || !selectedRecipeId}
          type="button"
          onClick={handleAddMeal}
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          {isSaving ? "Adding..." : "Add to Plan"}
        </Button>
      </footer>
    </ModalShell>
  );
}
