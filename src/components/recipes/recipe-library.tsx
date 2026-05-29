"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Camera, Download, Plus } from "lucide-react";

import { AddMealDialog } from "@/components/meal-planner/add-meal-dialog";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { RecipeListItem } from "@/components/recipes/recipe-list-item";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { SearchBar } from "@/components/ui/search-bar";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/types/recipes";

type RecipeLibraryProps = {
  recipes: Recipe[];
  userId: string;
};

type FilterOption = "all" | "favorites" | "dinner" | "lunch" | "desserts";

const filters: { label: string; value: FilterOption }[] = [
  { label: "All", value: "all" },
  { label: "Favorites", value: "favorites" },
  { label: "Dinner", value: "dinner" },
  { label: "Lunch", value: "lunch" },
  { label: "Desserts", value: "desserts" },
];

export function RecipeLibrary({ recipes, userId }: RecipeLibraryProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [planningRecipe, setPlanningRecipe] = useState<Recipe | null>(null);

  const filteredRecipes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return recipes.filter((recipe) => {
      const textMatch =
        !normalizedQuery ||
        [recipe.title, recipe.description, recipe.category, ...(recipe.tags ?? [])]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery));

      if (!textMatch) {
        return false;
      }

      const category = recipe.category?.toLowerCase() ?? "";
      const tags = (recipe.tags ?? []).map((tag) => tag.toLowerCase());

      if (activeFilter === "favorites") {
        return tags.includes("favorite") || tags.includes("favorites");
      }

      if (activeFilter === "dinner") {
        return category.includes("dinner");
      }

      if (activeFilter === "lunch") {
        return category.includes("lunch");
      }

      if (activeFilter === "desserts") {
        return category.includes("dessert") || category.includes("sweet");
      }

      return true;
    });
  }, [activeFilter, query, recipes]);

  if (recipes.length === 0) {
    return (
      <EmptyState
        title="Your recipe box is empty."
        description="Save recipes to see them here."
        actionLabel="Add Your First Recipe"
        actionHref="/recipes/new"
      />
    );
  }

  return (
    <>
      <section className="rounded-3xl border bg-card p-4 shadow-subtle sm:p-5">
        <SearchBar
          id="recipe-search-input"
          label="Search recipes"
          value={query}
          placeholder="Search recipes..."
          onChange={setQuery}
        />

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Recipe filters">
          {filters.map((filter) => (
            <FilterChip
              key={filter.value}
              label={filter.label}
              active={activeFilter === filter.value}
              onClick={() => setActiveFilter(filter.value)}
            />
          ))}
        </div>
      </section>

      {filteredRecipes.length > 0 ? (
        <>
          <section className="space-y-2.5 md:hidden">
            {filteredRecipes.map((recipe) => (
              <RecipeListItem key={recipe.id} recipe={recipe} />
            ))}
          </section>

          <section className="hidden grid-cols-2 gap-4 md:grid xl:grid-cols-3">
            {filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} onAddToPlan={setPlanningRecipe} />
            ))}
          </section>
        </>
      ) : (
        <EmptyState
          title="No recipes found."
          description="Try another search."
          actionLabel="Clear Search"
          actionOnClick={() => {
            setQuery("");
            setActiveFilter("all");
          }}
        />
      )}

      <div className="fixed inset-x-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 md:hidden">
        <Link className={cn(buttonVariants(), "w-full rounded-xl")} href="/recipes/new">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add Recipe
        </Link>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <Link className={cn(buttonVariants({ variant: "secondary" }), "gap-2 rounded-xl")} href="/recipes/import">
          <Download className="h-4 w-4" aria-hidden="true" />
          Import
        </Link>
        <Link
          className={cn(buttonVariants({ variant: "secondary" }), "gap-2 rounded-xl")}
          href="/recipes/import/scan"
        >
          <Camera className="h-4 w-4" aria-hidden="true" />
          Scan
        </Link>
        <Link className={cn(buttonVariants(), "gap-2 rounded-xl")} href="/recipes/new">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Recipe
        </Link>
      </div>

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
    </>
  );
}
