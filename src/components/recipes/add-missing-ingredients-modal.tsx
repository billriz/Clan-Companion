"use client";

import { useMemo, useState } from "react";
import { CheckSquare, ListChecks, Plus, Square, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { getWeekStartKey } from "@/lib/meal-plans";
import { buildShoppingListPayloadFromIngredients } from "@/lib/pantry";
import { createClient } from "@/lib/supabase/client";
import type { PantryComparisonResult, PantryIngredientMatch } from "@/types/pantry";

type AddMissingIngredientsModalProps = {
  isOpen: boolean;
  recipeTitle: string;
  comparison: PantryComparisonResult;
  userId: string;
  onOpenChange: (isOpen: boolean) => void;
  onItemsAdded?: (count: number) => void;
};

type ReviewItem = {
  key: string;
  match: PantryIngredientMatch;
};

export function AddMissingIngredientsModal({
  isOpen,
  recipeTitle,
  comparison,
  userId,
  onOpenChange,
  onItemsAdded,
}: AddMissingIngredientsModalProps) {
  const reviewItems = useMemo(() => {
    const missing = comparison.missingIngredients.map((match, index) => ({
      key: `missing-${index}`,
      match,
    }));
    const partial = comparison.partialIngredients.map((match, index) => ({
      key: `partial-${index}`,
      match,
    }));
    const available = comparison.availableIngredients.map((match, index) => ({
      key: `available-${index}`,
      match,
    }));

    return {
      missing,
      partial,
      available,
      all: [...missing, ...partial, ...available],
    };
  }, [comparison]);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(reviewItems.missing.map((item) => item.key)),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = reviewItems.all.filter((item) => selectedKeys.has(item.key)).length;

  async function handleAddToShoppingList() {
    const selectedIngredients = reviewItems.all
      .filter((item) => selectedKeys.has(item.key))
      .map((item) => item.match.ingredient);

    if (selectedIngredients.length === 0) {
      setError("Select at least one ingredient to add.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = buildShoppingListPayloadFromIngredients({
      ingredients: selectedIngredients,
      userId,
      weekStartKey: getWeekStartKey(new Date()),
    });

    if (payload.length === 0) {
      setError("No valid ingredient names were found to add.");
      setIsSaving(false);
      return;
    }

    const supabase = createClient();
    const { error: insertError } = await supabase.from("shopping_list_items").insert(payload);

    if (insertError) {
      setError(insertError.message);
      setIsSaving(false);
      return;
    }

    onItemsAdded?.(payload.length);
    setIsSaving(false);
    onOpenChange(false);
  }

  function toggleIngredient(key: string) {
    setSelectedKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);

      if (nextKeys.has(key)) {
        nextKeys.delete(key);
      } else {
        nextKeys.add(key);
      }

      return nextKeys;
    });
  }

  function renderSection({
    title,
    emptyMessage,
    items,
    tone,
    selectionLabel,
  }: {
    title: string;
    emptyMessage: string;
    items: ReviewItem[];
    tone: "default" | "blue" | "terracotta" | "neutral";
    selectionLabel: string;
  }) {
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gravy-charcoal">{title}</h3>
          <Badge variant={tone}>{items.length}</Badge>
        </div>

        {items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item) => {
              const isSelected = selectedKeys.has(item.key);
              const amount = [item.match.ingredient.quantity, item.match.ingredient.unit]
                .filter(Boolean)
                .join(" ")
                .trim();

              return (
                <li
                  key={item.key}
                  className="rounded-xl border bg-card px-3 py-2 text-sm text-gravy-charcoal"
                >
                  <button
                    aria-pressed={isSelected}
                    className="flex w-full items-start gap-3 text-left"
                    disabled={isSaving}
                    type="button"
                    onClick={() => toggleIngredient(item.key)}
                  >
                    <span className="mt-0.5 text-primary" aria-hidden="true">
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{item.match.ingredient.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {amount || "No quantity listed"}
                      </span>
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs font-medium text-muted-foreground">
                      {selectionLabel}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed bg-gravy-paper px-3 py-3 text-xs text-muted-foreground">
            {emptyMessage}
          </p>
        )}
      </section>
    );
  }

  return (
    <ModalShell
      isOpen={isOpen}
      labelledBy="add-missing-items-title"
      describedBy="add-missing-items-description"
      panelClassName="max-h-[92vh] max-w-2xl"
      onClose={() => {
        if (isSaving) {
          return;
        }

        onOpenChange(false);
      }}
    >
      <header className="flex items-start justify-between gap-4 border-b bg-card px-4 py-4 sm:px-6">
        <div>
          <Badge variant="blue">Recipe to grocery list</Badge>
          <h2 id="add-missing-items-title" className="mt-2 text-xl font-semibold text-gravy-charcoal">
            Review Ingredients
          </h2>
          <p id="add-missing-items-description" className="mt-1 text-sm text-muted-foreground">
            Missing ingredients are preselected for {recipeTitle}.
          </p>
        </div>
        <Button
          aria-label="Close"
          className="h-10 w-10 rounded-xl px-0"
          disabled={isSaving}
          type="button"
          variant="secondary"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </header>

      <div className="space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="grid gap-3 rounded-2xl border bg-card p-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Have</p>
            <p className="mt-1 text-lg font-semibold text-gravy-charcoal">
              {comparison.availableIngredients.length}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Missing</p>
            <p className="mt-1 text-lg font-semibold text-gravy-charcoal">
              {comparison.missingIngredients.length}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check Quantity</p>
            <p className="mt-1 text-lg font-semibold text-gravy-charcoal">
              {comparison.partialIngredients.length}
            </p>
          </div>
        </div>

        {renderSection({
          title: "Missing",
          emptyMessage: "No missing ingredients.",
          items: reviewItems.missing,
          tone: "terracotta",
          selectionLabel: "Add",
        })}

        {renderSection({
          title: "Partial / Check Quantity",
          emptyMessage: "No partial matches.",
          items: reviewItems.partial,
          tone: "neutral",
          selectionLabel: "Add anyway",
        })}

        {renderSection({
          title: "Already Have",
          emptyMessage: "No pantry matches yet.",
          items: reviewItems.available,
          tone: "default",
          selectionLabel: "Add anyway",
        })}

        {error ? (
          <div
            className="rounded-2xl border border-gravy-brown/30 bg-gravy-brown/10 px-4 py-3 text-sm text-gravy-brown"
            role="alert"
          >
            {error}
          </div>
        ) : null}
      </div>

      <footer className="flex flex-col gap-2 border-t bg-card px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
          {selectedCount} ingredient{selectedCount === 1 ? "" : "s"} selected
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="h-11 rounded-xl"
            disabled={isSaving}
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="h-11 gap-2 rounded-xl"
            disabled={isSaving || selectedCount === 0}
            type="button"
            onClick={handleAddToShoppingList}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {isSaving ? "Adding..." : "Add Selected to Grocery List"}
          </Button>
        </div>
      </footer>
    </ModalShell>
  );
}
