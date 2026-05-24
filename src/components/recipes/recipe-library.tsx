"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Camera, Download, Plus, Search, X } from "lucide-react";

import { AddMealDialog } from "@/components/meal-planner/add-meal-dialog";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DIFFICULTIES, normalizeDifficulty } from "@/lib/recipes";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/types/recipes";

type RecipeLibraryProps = {
  recipes: Recipe[];
  userId: string;
};

type Filter = {
  label: string;
  value: string;
  type: "all" | "difficulty" | "category";
};

export function RecipeLibrary({ recipes, userId }: RecipeLibraryProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [planningRecipe, setPlanningRecipe] = useState<Recipe | null>(null);

  const categoryFilters = useMemo(() => {
    return Array.from(
      new Set(
        recipes
          .map((recipe) => recipe.category?.trim())
          .filter((category): category is string => Boolean(category)),
      ),
    ).sort((first, second) => first.localeCompare(second));
  }, [recipes]);

  const filters: Filter[] = [
    { label: "All", value: "all", type: "all" },
    ...DIFFICULTIES.map((difficulty) => ({
      label: difficulty,
      value: `difficulty:${difficulty}`,
      type: "difficulty" as const,
    })),
    ...categoryFilters.map((category) => ({
      label: category,
      value: `category:${category}`,
      type: "category" as const,
    })),
  ];

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return recipes.filter((recipe) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          recipe.title,
          recipe.description,
          recipe.category,
          normalizeDifficulty(recipe.difficulty),
          ...(recipe.tags ?? []),
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery));

      if (!matchesQuery) {
        return false;
      }

      if (activeFilter === "all") {
        return true;
      }

      const [type, value] = activeFilter.split(":");

      if (type === "difficulty") {
        return normalizeDifficulty(recipe.difficulty) === value;
      }

      if (type === "category") {
        return recipe.category === value;
      }

      return true;
    });
  }, [activeFilter, query, recipes]);

  if (recipes.length === 0) {
    return <RecipeEmptyState />;
  }

  const hasActiveFilters = activeFilter !== "all" || query.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-4 shadow-subtle sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-plate-charcoal">Recipe library</h2>
            <p className="text-sm text-muted-foreground">
              {filteredRecipes.length} of {recipes.length} recipes shown
            </p>
          </div>
          {hasActiveFilters ? (
            <Button
              className="h-10 gap-2"
              type="button"
              variant="secondary"
              onClick={() => {
                setQuery("");
                setActiveFilter("all");
              }}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Clear filters
            </Button>
          ) : null}
        </div>

        <div className="mt-4 max-w-2xl">
          <label className="sr-only" htmlFor="recipe-search-input">
            Search recipes
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="recipe-search-input"
              className="pl-10"
              placeholder="Search recipes, tags, categories..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Recipe filters">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.value;

            return (
              <button
                key={filter.value}
                aria-pressed={isActive}
                className={cn(
                  "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-subtle"
                    : filter.type === "category"
                      ? "border-plate-blue/25 bg-plate-blue/10 text-plate-blue hover:bg-plate-blue/15"
                      : "border-border bg-plate-paper text-muted-foreground hover:bg-secondary hover:text-plate-charcoal",
                )}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {filteredRecipes.length > 0 ? (
        <div className="grid auto-rows-fr grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onAddToPlan={setPlanningRecipe} />
          ))}
        </div>
      ) : (
        <div
          className="rounded-2xl border border-dashed bg-plate-paper p-8 text-center shadow-subtle"
          role="status"
        >
          <Badge variant="neutral">No matches</Badge>
          <h2 className="mt-4 text-xl font-semibold text-plate-charcoal">No recipes found</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Try a different search term or clear the active filter to bring more recipes back into
            view.
          </p>
        </div>
      )}

      <AddMealDialog
        key={planningRecipe?.id ?? "closed"}
        initialRecipeId={planningRecipe?.id}
        isOpen={Boolean(planningRecipe)}
        recipes={recipes}
        userId={userId}
        onOpenChange={(nextOpenState) => {
          if (!nextOpenState) {
            setPlanningRecipe(null);
          }
        }}
      />
    </div>
  );
}

function RecipeEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed bg-plate-paper p-8 text-center shadow-subtle">
      <Badge variant="terracotta">Recipe library</Badge>
      <h2 className="mt-4 text-2xl font-semibold text-plate-charcoal">Save your first recipe</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        Add family favorites, weeknight staples, and recipes you want ready when planning begins.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link className={cn(buttonVariants({ variant: "secondary" }), "gap-2")} href="/recipes/import">
          <Download className="h-4 w-4" aria-hidden="true" />
          Import Recipes
        </Link>
        <Link className={cn(buttonVariants({ variant: "secondary" }), "gap-2")} href="/recipes/import/scan">
          <Camera className="h-4 w-4" aria-hidden="true" />
          Scan Recipe
        </Link>
        <Link className={cn(buttonVariants(), "gap-2")} href="/recipes/new">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create Recipe
        </Link>
      </div>
    </div>
  );
}
