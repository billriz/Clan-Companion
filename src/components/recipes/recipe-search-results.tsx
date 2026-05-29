"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { RecipeListItem } from "@/components/recipes/recipe-list-item";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBar } from "@/components/ui/search-bar";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/types/recipes";

type RecipeSearchResultsProps = {
  initialQuery: string;
  recipes: Recipe[];
};

export function RecipeSearchResults({ initialQuery, recipes }: RecipeSearchResultsProps) {
  const [query, setQuery] = useState(initialQuery);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return recipes;
    }

    return recipes.filter((recipe) =>
      [recipe.title, recipe.description, recipe.category, ...(recipe.tags ?? [])]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized)),
    );
  }, [query, recipes]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6 lg:max-w-5xl lg:px-8 lg:py-10">
      <div className="flex items-center gap-2">
        <Link className={cn(buttonVariants({ variant: "secondary" }), "h-10 rounded-xl px-3")} href="/recipes">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
        <SearchBar
          id="recipe-results-query"
          label="Search query"
          value={query}
          placeholder="Search recipes"
          onChange={setQuery}
          className="flex-1"
        />
        <Link className="text-sm font-semibold text-muted-foreground" href="/recipes">
          Cancel
        </Link>
      </div>

      {results.length > 0 ? (
        <div className="space-y-2.5">
          {results.map((recipe) => (
            <RecipeListItem key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <EmptyState title="No recipes found." description="Try another search." />
      )}
    </div>
  );
}
