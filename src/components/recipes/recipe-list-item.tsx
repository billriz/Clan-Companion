import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Clock3, Heart } from "lucide-react";

import { RecipeImagePlaceholder } from "@/components/recipes/recipe-image-placeholder";
import { formatMinutes, getTotalTime, normalizeDifficulty } from "@/lib/recipes";
import type { Recipe } from "@/types/recipes";

type RecipeListItemProps = {
  recipe: Recipe;
  href?: string;
  showFavorite?: boolean;
};

export function RecipeListItem({ recipe, href, showFavorite = true }: RecipeListItemProps) {
  const targetHref = href ?? `/recipes/${recipe.id}`;
  const totalTime = getTotalTime(recipe);
  const timeLabel = formatMinutes(totalTime > 0 ? totalTime : recipe.prep_time);

  return (
    <Link
      href={targetHref}
      className="grid min-h-24 grid-cols-[86px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-card p-2.5 shadow-subtle transition hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative h-[72px] overflow-hidden rounded-xl bg-secondary">
        {recipe.image_url ? (
          <Image fill alt={recipe.title} className="object-cover" sizes="72px" src={recipe.image_url} />
        ) : (
          <RecipeImagePlaceholder iconClassName="h-6 w-6" />
        )}
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-semibold text-gravy-charcoal">{recipe.title}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {timeLabel}
          </span>
          <span>{normalizeDifficulty(recipe.difficulty)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-muted-foreground">
        {showFavorite ? <Heart className="h-4 w-4 text-gravy-gold" aria-hidden="true" /> : null}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </div>
    </Link>
  );
}
