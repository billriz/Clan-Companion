"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Clock3, Heart, Signal } from "lucide-react";

import { RecipeImagePlaceholder } from "@/components/recipes/recipe-image-placeholder";
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

  function handleAddToPlan() {
    if (onAddToPlan) {
      onAddToPlan(recipe);
      return;
    }

    router.push("/meal-planner");
  }

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border bg-card shadow-subtle">
      <Link
        href={`/recipes/${recipe.id}`}
        aria-label={`View ${recipe.title}`}
        className="group flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
          {recipe.image_url ? (
            <Image
              fill
              alt={recipe.title}
              className="object-cover transition duration-300 group-hover:scale-105"
              sizes="(min-width: 1280px) 28vw, (min-width: 768px) 42vw, 100vw"
              src={recipe.image_url}
            />
          ) : (
            <RecipeImagePlaceholder />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <h2 className="line-clamp-2 text-lg font-semibold text-gravy-charcoal">{recipe.title}</h2>

          <div className="mt-auto flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
              {timeLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <Signal className="h-4 w-4 text-primary" aria-hidden="true" />
              {normalizeDifficulty(recipe.difficulty)}
            </span>
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-[1fr_44px] gap-2 border-t p-3">
        <Button className="h-10 rounded-xl" type="button" onClick={handleAddToPlan}>
          <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add to Plan
        </Button>
        <Button
          aria-label={isFavorite ? "Remove favorite" : "Favorite recipe"}
          aria-pressed={isFavorite}
          className="h-10 w-10 rounded-xl px-0"
          type="button"
          variant="secondary"
          onClick={() => setIsFavorite((current) => !current)}
        >
          <Heart
            className={isFavorite ? "h-4 w-4 fill-gravy-gold text-gravy-gold" : "h-4 w-4 text-gravy-gold"}
            aria-hidden="true"
          />
        </Button>
      </div>
    </article>
  );
}
