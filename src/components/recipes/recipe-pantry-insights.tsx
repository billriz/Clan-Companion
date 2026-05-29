"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { AddMissingIngredientsModal } from "@/components/recipes/add-missing-ingredients-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { compareRecipeToPantry } from "@/lib/pantry";
import type { PantryItem } from "@/types/pantry";
import type { Ingredient } from "@/types/recipes";

type RecipePantryInsightsProps = {
  recipeTitle: string;
  ingredients: Ingredient[];
  pantryItems: PantryItem[];
  userId: string;
};

export function RecipePantryInsights({
  recipeTitle,
  ingredients,
  pantryItems,
  userId,
}: RecipePantryInsightsProps) {
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const comparison = useMemo(
    () => compareRecipeToPantry(ingredients, pantryItems),
    [ingredients, pantryItems],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-gravy-paper p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gravy-charcoal">
              You have {comparison.availableCount} of {comparison.totalCount} ingredients
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {comparison.missingIngredients.length} missing ingredient
              {comparison.missingIngredients.length === 1 ? "" : "s"}
              {comparison.partialIngredients.length > 0
                ? `, ${comparison.partialIngredients.length} to check`
                : ""}
            </p>
          </div>
          <Button
            className="h-11 gap-2 rounded-xl"
            disabled={comparison.totalCount === 0}
            type="button"
            onClick={() => setIsReviewOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add missing ingredients to grocery list
          </Button>
        </div>
      </div>

      {ingredients.length > 0 ? (
        <ul className="space-y-3" aria-label="Ingredients list">
          {comparison.ingredientMatches.map((match, index) => (
            <li
              key={`${match.ingredient.name}-${index}`}
              className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-gravy-paper px-4 py-3 text-sm text-gravy-charcoal"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="min-w-20 font-semibold text-primary">
                  {[match.ingredient.quantity, match.ingredient.unit].filter(Boolean).join(" ") || "-"}
                </span>
                <span className="min-w-0 break-words">{match.ingredient.name || "Ingredient"}</span>
              </div>
              <Badge variant={getStatusVariant(match.status)}>{getStatusLabel(match.status)}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">No ingredients have been added yet.</p>
      )}

      {notice ? (
        <div
          className="rounded-xl border border-gravy-gold/25 bg-gravy-gold/10 px-4 py-3 text-sm text-gravy-brown"
          role="status"
        >
          {notice}
        </div>
      ) : null}

      {isReviewOpen ? (
        <AddMissingIngredientsModal
          isOpen={isReviewOpen}
          recipeTitle={recipeTitle}
          comparison={comparison}
          userId={userId}
          onItemsAdded={(count) => {
            setNotice(
              `Added ${count} ingredient${count === 1 ? "" : "s"} from ${recipeTitle} to this week's grocery list.`,
            );
          }}
          onOpenChange={setIsReviewOpen}
        />
      ) : null}
    </div>
  );
}

function getStatusLabel(status: "have" | "partial" | "missing") {
  if (status === "have") {
    return "Have";
  }

  if (status === "partial") {
    return "Partial / check";
  }

  return "Missing";
}

function getStatusVariant(status: "have" | "partial" | "missing") {
  if (status === "have") {
    return "default" as const;
  }

  if (status === "partial") {
    return "neutral" as const;
  }

  return "terracotta" as const;
}
