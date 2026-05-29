import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { RecipeImagePlaceholder } from "@/components/recipes/recipe-image-placeholder";
import type { MealPlanWithRecipe } from "@/types/meal-plans";

type MealPlanCardProps = {
  plan: MealPlanWithRecipe;
  dayLabel: string;
  href?: string;
};

export function MealPlanCard({ plan, dayLabel, href }: MealPlanCardProps) {
  const recipe = plan.recipe;

  return (
    <Link
      href={href ?? (recipe ? `/recipes/${recipe.id}` : "/meal-planner")}
      className="grid grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-card p-2.5 shadow-subtle transition hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative h-[50px] overflow-hidden rounded-xl bg-secondary">
        {recipe?.image_url ? (
          <Image fill alt={recipe.title} className="object-cover" sizes="50px" src={recipe.image_url} />
        ) : (
          <RecipeImagePlaceholder iconClassName="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{dayLabel}</p>
        <h3 className="line-clamp-2 text-sm font-semibold text-gravy-charcoal">{recipe?.title ?? "Open slot"}</h3>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
