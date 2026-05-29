"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarPlus, Clock3, Eye, Trash2, UsersRound } from "lucide-react";

import { RecipeImagePlaceholder } from "@/components/recipes/recipe-image-placeholder";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatMinutes } from "@/lib/recipes";
import { cn } from "@/lib/utils";
import type { MealPlanWithRecipe, MealType } from "@/types/meal-plans";

type MealSlotProps = {
  dateKey: string;
  mealType: MealType;
  plan?: MealPlanWithRecipe;
  isRemoving?: boolean;
  onAdd: (dateKey: string, mealType: MealType) => void;
  onRemove: (plan: MealPlanWithRecipe) => void;
};

export function MealSlot({
  dateKey,
  mealType,
  plan,
  isRemoving = false,
  onAdd,
  onRemove,
}: MealSlotProps) {
  if (!plan) {
    return (
      <section className="min-h-[164px] rounded-2xl border border-dashed border-primary/35 bg-card/70 p-3 shadow-subtle transition hover:-translate-y-0.5 hover:border-primary/60 hover:bg-card hover:shadow-soft">
        <div className="flex h-full min-h-[138px] flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarPlus className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gravy-charcoal">{mealType}</h3>
            <p className="mt-1 text-xs text-muted-foreground">No meal planned</p>
          </div>
          <Button className="h-10 gap-2 rounded-xl px-4" type="button" onClick={() => onAdd(dateKey, mealType)}>
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Add Meal
          </Button>
        </div>
      </section>
    );
  }

  const recipe = plan.recipe;
  const prepTime = formatMinutes(recipe?.prep_time);

  return (
    <section className="min-h-[164px] rounded-2xl border bg-card p-3 shadow-subtle transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex h-full min-h-[138px] flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-primary">{mealType}</h3>
          <Button
            aria-label={`Remove ${recipe?.title ?? "meal"} from ${mealType}`}
            className="h-10 w-10 rounded-xl px-0 text-gravy-brown hover:bg-gravy-brown/10 hover:text-gravy-brown"
            disabled={isRemoving}
            type="button"
            variant="ghost"
            onClick={() => onRemove(plan)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-3">
          <div className="relative h-[68px] overflow-hidden rounded-xl bg-secondary">
            {recipe?.image_url ? (
              <Image
                fill
                alt={recipe.title}
                className="object-cover"
                sizes="68px"
                src={recipe.image_url}
              />
            ) : (
              <RecipeImagePlaceholder iconClassName="h-6 w-6" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="line-clamp-2 text-sm font-semibold leading-5 text-gravy-charcoal">
              {recipe?.title ?? "Saved meal"}
            </h4>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {prepTime}
              </span>
              <span className="inline-flex items-center gap-1">
                <UsersRound className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {recipe?.servings ? `${recipe.servings} servings` : "Flexible"}
              </span>
            </div>
          </div>
        </div>

        {recipe ? (
          <Link
            className={cn(buttonVariants({ variant: "secondary" }), "mt-auto h-10 w-full gap-2 rounded-xl text-xs")}
            href={`/recipes/${recipe.id}`}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            View Recipe
          </Link>
        ) : null}
      </div>
    </section>
  );
}
