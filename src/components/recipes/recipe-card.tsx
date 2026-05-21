"use client";

/* eslint-disable @next/next/no-img-element */

import { type KeyboardEvent, type MouseEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Clock3, Heart, Signal, UsersRound } from "lucide-react";

import { RecipeImagePlaceholder } from "@/components/recipes/recipe-image-placeholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMinutes, getTotalTime, normalizeDifficulty } from "@/lib/recipes";
import type { Recipe } from "@/types/recipes";

type RecipeCardProps = {
  recipe: Recipe;
  onAddToPlan?: (recipe: Recipe) => void;
};

export function RecipeCard({ recipe, onAddToPlan }: RecipeCardProps) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const totalTime = getTotalTime(recipe);
  const timeLabel = totalTime > 0 ? formatMinutes(totalTime) : formatMinutes(recipe.prep_time);
  const difficulty = normalizeDifficulty(recipe.difficulty);
  const badgeLabel = recipe.category || recipe.tags?.[0] || "Family meal";

  function navigateToRecipe() {
    router.push(`/recipes/${recipe.id}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigateToRecipe();
    }
  }

  function stopCardNavigation(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleAddToPlan(event: MouseEvent<HTMLButtonElement>) {
    stopCardNavigation(event);
    if (onAddToPlan) {
      onAddToPlan(recipe);
      return;
    }

    router.push("/meal-planner");
  }

  function handleFavorite(event: MouseEvent<HTMLButtonElement>) {
    stopCardNavigation(event);
    setIsFavorite((current) => !current);
  }

  return (
    <article
      className="group/card flex h-full min-h-[420px] cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white text-plate-charcoal shadow-subtle transition hover:-translate-y-0.5 hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-plate-cream"
      onClick={navigateToRecipe}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`View ${recipe.title}`}
    >
      <div className="aspect-video overflow-hidden rounded-t-2xl bg-secondary">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="h-full w-full object-cover transition duration-500 md:group-hover/card:scale-105"
          />
        ) : (
          <RecipeImagePlaceholder />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="line-clamp-2 text-lg font-semibold leading-6 text-plate-charcoal">
              {recipe.title}
            </h2>
            <Badge className="shrink-0" variant={recipe.category ? "blue" : "terracotta"}>
              {badgeLabel}
            </Badge>
          </div>
          <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
            {recipe.description || "A saved recipe ready for a weeknight plan."}
          </p>
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
            {timeLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <UsersRound className="h-4 w-4 text-primary" aria-hidden="true" />
            {recipe.servings ? `${recipe.servings}` : "Any"}
          </span>
          <span className="flex items-center gap-1.5">
            <Signal className="h-4 w-4 text-primary" aria-hidden="true" />
            {difficulty}
          </span>
        </div>

        <div className="flex items-center gap-2 border-t pt-4">
          <Button className="h-9 flex-1 gap-2" type="button" onClick={handleAddToPlan}>
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Add to Plan
          </Button>
          <Button
            aria-label={isFavorite ? "Remove favorite placeholder" : "Favorite placeholder"}
            aria-pressed={isFavorite}
            className="h-9 w-9 px-0"
            type="button"
            variant="secondary"
            onClick={handleFavorite}
          >
            <Heart
              className={isFavorite ? "h-4 w-4 fill-plate-terracotta text-plate-terracotta" : "h-4 w-4"}
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>
    </article>
  );
}
