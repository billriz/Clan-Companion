"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChefHat,
  Loader2,
  ListChecks,
  Search,
  X,
} from "lucide-react";

import { AddMissingIngredientsModal } from "@/components/recipes/add-missing-ingredients-modal";
import { RecipeImagePlaceholder } from "@/components/recipes/recipe-image-placeholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import {
  DEFAULT_PANTRY_RECIPE_RANKING,
  isNonFoodPantryCategory,
  shouldDefaultSelectPantryItem,
} from "@/lib/pantry-recipe-search";
import { normalizeIngredientName } from "@/lib/ingredients";
import { cn } from "@/lib/utils";
import type { PantryComparisonResult, PantryIngredientMatch, PantryItem } from "@/types/pantry";
import type { Recipe } from "@/types/recipes";
import type {
  NormalizedPantryRecipeResult,
  NormalizedPantryRecipeResultIngredient,
} from "@/types/spoonacular";

type FindRecipesFromPantryProps = {
  pantryItems: PantryItem[];
  userId: string;
};

type PantryRecipeSearchResponse = {
  results?: NormalizedPantryRecipeResult[];
  error?: string;
};

type ImportApiResponse = {
  message?: string;
  alreadyImported?: boolean;
  recipe?: Recipe;
  error?: string;
};

type ImportedLookup = Record<string, { recipeId: string; alreadyImported: boolean }>;

type ToastState = {
  variant: "success" | "error";
  title: string;
  message: string;
  recipeId?: string;
};

type SelectablePantryIngredient = {
  key: string;
  name: string;
  category: string | null;
  isDefaultSelected: boolean;
};

const NO_PANTRY_ITEMS_MESSAGE =
  "Add a few pantry items first, then Plate Plan can help find recipes you can make.";
const NO_SELECTION_MESSAGE = "Select at least one pantry item to search for recipes.";
const NO_RESULTS_MESSAGE =
  "No recipes found with those pantry items. Try selecting more ingredients.";

export function FindRecipesFromPantry({ pantryItems, userId }: FindRecipesFromPantryProps) {
  const selectableIngredients = useMemo(
    () => buildSelectablePantryIngredients(pantryItems),
    [pantryItems],
  );
  const knownKeysRef = useRef<Set<string>>(new Set());

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<NormalizedPantryRecipeResult[]>([]);

  const [previewRecipe, setPreviewRecipe] = useState<NormalizedPantryRecipeResult | null>(null);
  const [selectedMissingRecipe, setSelectedMissingRecipe] =
    useState<NormalizedPantryRecipeResult | null>(null);

  const [importingRecipeId, setImportingRecipeId] = useState<number | null>(null);
  const [importedLookup, setImportedLookup] = useState<ImportedLookup>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentKeys = new Set(selectableIngredients.map((item) => item.key));

    setSelectedKeys((currentSelectedKeys) => {
      const nextSelectedKeys = new Set(
        Array.from(currentSelectedKeys).filter((key) => currentKeys.has(key)),
      );

      selectableIngredients.forEach((ingredient) => {
        if (!knownKeysRef.current.has(ingredient.key) && ingredient.isDefaultSelected) {
          nextSelectedKeys.add(ingredient.key);
        }
      });

      return nextSelectedKeys;
    });

    knownKeysRef.current = currentKeys;
  }, [selectableIngredients]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const selectedIngredients = useMemo(
    () => selectableIngredients.filter((ingredient) => selectedKeys.has(ingredient.key)),
    [selectableIngredients, selectedKeys],
  );

  async function handleFindRecipes() {
    if (selectableIngredients.length === 0) {
      setSearchError(NO_PANTRY_ITEMS_MESSAGE);
      setHasSearched(false);
      setResults([]);
      return;
    }

    if (selectedIngredients.length === 0) {
      setSearchError(NO_SELECTION_MESSAGE);
      setHasSearched(true);
      setResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/pantry/recipes/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ingredientNames: selectedIngredients.map((ingredient) => ingredient.name),
          ingredientItems: selectedIngredients.map((ingredient) => ({
            name: ingredient.name,
            category: ingredient.category,
          })),
          number: 12,
          ranking: DEFAULT_PANTRY_RECIPE_RANKING,
          ignorePantry: false,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as PantryRecipeSearchResponse;

      if (!response.ok) {
        setResults([]);
        setHasSearched(true);
        setSearchError(payload.error ?? "Recipe search is temporarily unavailable. Please try again later.");
        return;
      }

      const nextResults = Array.isArray(payload.results) ? payload.results : [];
      setResults(nextResults);
      setHasSearched(true);
      setSearchError(null);
    } catch {
      setResults([]);
      setHasSearched(true);
      setSearchError("Recipe search is temporarily unavailable. Please try again later.");
    } finally {
      setIsSearching(false);
    }
  }

  function toggleIngredientSelection(ingredientKey: string) {
    setSelectedKeys((currentSelectedKeys) => {
      const nextSelectedKeys = new Set(currentSelectedKeys);

      if (nextSelectedKeys.has(ingredientKey)) {
        nextSelectedKeys.delete(ingredientKey);
      } else {
        nextSelectedKeys.add(ingredientKey);
      }

      return nextSelectedKeys;
    });
  }

  function selectAllIngredients() {
    setSelectedKeys(new Set(selectableIngredients.map((ingredient) => ingredient.key)));
  }

  function clearAllIngredients() {
    setSelectedKeys(new Set());
  }

  function showToast(nextToast: ToastState) {
    setToast(nextToast);

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 5000);
  }

  async function handleSaveRecipe(recipe: NormalizedPantryRecipeResult) {
    const lookupKey = String(recipe.id);
    const existingRecipe = importedLookup[lookupKey];

    if (existingRecipe) {
      showToast({
        variant: "success",
        title: "Already in your library",
        message: "This recipe is already saved in Plate Plan.",
        recipeId: existingRecipe.recipeId,
      });
      return;
    }

    const spoonacularId = parsePositiveInteger(recipe.id);

    if (!spoonacularId) {
      showToast({
        variant: "error",
        title: "Save failed",
        message: "Recipe could not be saved right now.",
      });
      return;
    }

    setImportingRecipeId(spoonacularId);

    try {
      const response = await fetch("/api/recipes/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ spoonacularId }),
      });

      const payload = (await response.json().catch(() => ({}))) as ImportApiResponse;

      if (!response.ok || !payload.recipe) {
        showToast({
          variant: "error",
          title: "Save failed",
          message: payload.error ?? "Recipe could not be saved right now.",
        });
        return;
      }

      const savedRecipe = payload.recipe;

      setImportedLookup((currentLookup) => ({
        ...currentLookup,
        [lookupKey]: {
          recipeId: savedRecipe.id,
          alreadyImported: Boolean(payload.alreadyImported),
        },
      }));

      showToast({
        variant: "success",
        title: payload.alreadyImported ? "Already saved" : "Recipe saved",
        message:
          payload.message ??
          (payload.alreadyImported
            ? "This recipe was already saved to your library."
            : "Recipe saved to your Plate Plan library."),
        recipeId: savedRecipe.id,
      });
    } catch {
      showToast({
        variant: "error",
        title: "Save failed",
        message: "Recipe could not be saved right now.",
      });
    } finally {
      setImportingRecipeId(null);
    }
  }

  const emptyStateMessage = hasSearched && !isSearching && results.length === 0 ? NO_RESULTS_MESSAGE : null;

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant="blue">Find recipes from pantry</Badge>
          <h2 className="mt-3 text-2xl font-semibold text-plate-charcoal">Find recipes from your pantry</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Select pantry items and search for recipes you can make with what you already have.
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ChefHat className="h-6 w-6" aria-hidden="true" />
        </div>
      </div>

      {selectableIngredients.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed bg-plate-paper p-5 text-sm text-muted-foreground">
          {NO_PANTRY_ITEMS_MESSAGE}
        </div>
      ) : (
        <>
          <div className="mt-5 rounded-2xl border bg-plate-paper p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-plate-charcoal">
                {selectedIngredients.length} of {selectableIngredients.length} selected
              </p>
              <div className="flex flex-wrap gap-2">
                <Button className="h-9 rounded-xl" type="button" variant="secondary" onClick={selectAllIngredients}>
                  Select all
                </Button>
                <Button className="h-9 rounded-xl" type="button" variant="secondary" onClick={clearAllIngredients}>
                  Clear all
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {selectableIngredients.map((ingredient) => {
                const isSelected = selectedKeys.has(ingredient.key);
                const isNonFood = isNonFoodPantryCategory(ingredient.category);

                return (
                  <label
                    key={ingredient.key}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 text-sm transition",
                      isSelected
                        ? "border-plate-blue/70 bg-plate-blue/10"
                        : "border-border bg-white hover:border-plate-blue/40",
                    )}
                  >
                    <input
                      checked={isSelected}
                      className="mt-1 h-4 w-4"
                      type="checkbox"
                      onChange={() => toggleIngredientSelection(ingredient.key)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-plate-charcoal">{ingredient.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {ingredient.category ?? "Other"}
                        {isNonFood ? " (not selected by default)" : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button className="h-11 gap-2 rounded-xl" disabled={isSearching} type="button" onClick={() => void handleFindRecipes()}>
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Finding recipes...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Find Recipes
                  </>
                )}
              </Button>
            </div>
          </div>

          {searchError ? (
            <div
              className="mt-4 flex items-start gap-3 rounded-2xl border border-plate-terracotta/35 bg-plate-terracotta/10 p-4 text-sm text-plate-terracotta"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{searchError}</p>
            </div>
          ) : null}

          {notice ? (
            <div
              className="mt-4 rounded-2xl border border-plate-blue/25 bg-plate-blue/10 px-4 py-3 text-sm text-plate-blue"
              role="status"
            >
              {notice}
            </div>
          ) : null}

          <div className="mt-5">
            {isSearching ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed bg-plate-paper p-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Looking up recipes...
              </div>
            ) : results.length > 0 ? (
              <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((recipe) => {
                  const spoonacularId = parsePositiveInteger(recipe.id);
                  const isSaving = Boolean(spoonacularId && importingRecipeId === spoonacularId);
                  const importMeta = importedLookup[String(recipe.id)];

                  return (
                    <PantryRecipeResultCard
                      key={`${recipe.id}`}
                      importMeta={importMeta}
                      isSaving={isSaving}
                      recipe={recipe}
                      onAddMissing={() => setSelectedMissingRecipe(recipe)}
                      onSave={() => void handleSaveRecipe(recipe)}
                      onViewDetails={() => setPreviewRecipe(recipe)}
                    />
                  );
                })}
              </div>
            ) : emptyStateMessage ? (
              <div className="rounded-2xl border border-dashed bg-plate-paper p-8 text-center">
                <Badge variant="neutral">No results</Badge>
                <h3 className="mt-3 text-xl font-semibold text-plate-charcoal">No recipes found</h3>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                  {emptyStateMessage}
                </p>
              </div>
            ) : null}
          </div>
        </>
      )}

      <PantryRecipeDetailsModal
        importMeta={previewRecipe ? importedLookup[String(previewRecipe.id)] : undefined}
        isSaving={Boolean(previewRecipe && importingRecipeId === parsePositiveInteger(previewRecipe.id))}
        recipe={previewRecipe}
        onAddMissing={(recipe) => {
          setPreviewRecipe(null);
          setSelectedMissingRecipe(recipe);
        }}
        onClose={() => setPreviewRecipe(null)}
        onSave={(recipe) => void handleSaveRecipe(recipe)}
      />

      <ToastMessage toast={toast} onClose={() => setToast(null)} />

      {selectedMissingRecipe ? (
        <AddMissingIngredientsModal
          isOpen={Boolean(selectedMissingRecipe)}
          comparison={toMissingOnlyComparison(selectedMissingRecipe.missedIngredients)}
          recipeTitle={selectedMissingRecipe.title}
          userId={userId}
          onItemsAdded={(count) => {
            setNotice(
              `Added ${count} ingredient${count === 1 ? "" : "s"} from ${selectedMissingRecipe.title} to this week's grocery list.`,
            );
          }}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedMissingRecipe(null);
            }
          }}
        />
      ) : null}
    </section>
  );
}

type PantryRecipeResultCardProps = {
  recipe: NormalizedPantryRecipeResult;
  isSaving: boolean;
  importMeta?: { recipeId: string; alreadyImported: boolean };
  onViewDetails: () => void;
  onSave: () => void;
  onAddMissing: () => void;
};

function PantryRecipeResultCard({
  recipe,
  isSaving,
  importMeta,
  onViewDetails,
  onSave,
  onAddMissing,
}: PantryRecipeResultCardProps) {
  const isSaved = Boolean(importMeta);
  const usedPreview = recipe.usedIngredients.slice(0, 3).map((ingredient) => ingredient.name);
  const missedPreview = recipe.missedIngredients.slice(0, 3).map((ingredient) => ingredient.name);

  return (
    <article className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-2xl border bg-white shadow-subtle">
      <div className="relative aspect-video overflow-hidden rounded-t-2xl bg-secondary">
        {recipe.image ? (
          <Image
            fill
            alt={recipe.title}
            className="object-cover"
            sizes="(min-width: 1280px) 28vw, (min-width: 768px) 48vw, 100vw"
            src={recipe.image}
          />
        ) : (
          <RecipeImagePlaceholder />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 text-lg font-semibold text-plate-charcoal">{recipe.title}</h3>

        <div className="grid grid-cols-2 gap-2 text-xs font-medium text-muted-foreground">
          <span className="rounded-lg bg-plate-paper px-2 py-1">
            Used: {recipe.usedIngredientCount}
          </span>
          <span className="rounded-lg bg-plate-paper px-2 py-1">
            Missing: {recipe.missedIngredientCount}
          </span>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="line-clamp-2">
            <span className="font-medium text-plate-charcoal">Used:</span>{" "}
            {usedPreview.length > 0 ? usedPreview.join(", ") : "None listed"}
          </p>
          <p className="line-clamp-2">
            <span className="font-medium text-plate-charcoal">Missing:</span>{" "}
            {missedPreview.length > 0 ? missedPreview.join(", ") : "None listed"}
          </p>
        </div>
      </div>

      <div className="grid gap-2 border-t p-4">
        <Button className="h-10 rounded-xl" type="button" variant="secondary" onClick={onViewDetails}>
          View details
        </Button>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            className="h-10 rounded-xl"
            disabled={isSaving || isSaved}
            type="button"
            variant={isSaved ? "secondary" : "default"}
            onClick={onSave}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : isSaved ? (
              importMeta?.alreadyImported ? "Already saved" : "Saved"
            ) : (
              "Save recipe"
            )}
          </Button>
          <Button
            className="h-10 rounded-xl"
            disabled={recipe.missedIngredients.length === 0}
            type="button"
            variant="secondary"
            onClick={onAddMissing}
          >
            Add missing
          </Button>
        </div>
      </div>

      {importMeta ? (
        <div className="border-t border-border/60 bg-plate-paper px-4 py-3">
          <Link className="text-sm font-medium text-primary hover:underline" href={`/recipes/${importMeta.recipeId}`}>
            View saved recipe
          </Link>
        </div>
      ) : null}
    </article>
  );
}

type PantryRecipeDetailsModalProps = {
  recipe: NormalizedPantryRecipeResult | null;
  isSaving: boolean;
  importMeta?: { recipeId: string; alreadyImported: boolean };
  onClose: () => void;
  onSave: (recipe: NormalizedPantryRecipeResult) => void;
  onAddMissing: (recipe: NormalizedPantryRecipeResult) => void;
};

function PantryRecipeDetailsModal({
  recipe,
  isSaving,
  importMeta,
  onClose,
  onSave,
  onAddMissing,
}: PantryRecipeDetailsModalProps) {
  const isSaved = Boolean(importMeta);

  return (
    <ModalShell
      isOpen={Boolean(recipe)}
      labelledBy="pantry-recipe-preview-title"
      describedBy="pantry-recipe-preview-description"
      panelClassName="max-h-[92vh] max-w-3xl"
      onClose={onClose}
    >
      {recipe ? (
        <>
          <header className="flex items-start justify-between gap-4 border-b bg-white px-4 py-4 sm:px-6">
            <div>
              <Badge variant="blue">Recipe details</Badge>
              <h2 id="pantry-recipe-preview-title" className="mt-2 text-2xl font-semibold text-plate-charcoal">
                {recipe.title}
              </h2>
            </div>
            <Button
              aria-label="Close details"
              className="h-10 w-10 rounded-xl px-0"
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </header>

          <div className="space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="relative aspect-video overflow-hidden rounded-2xl border bg-secondary">
              {recipe.image ? (
                <Image
                  fill
                  alt={recipe.title}
                  className="object-cover"
                  sizes="(min-width: 1024px) 760px, 100vw"
                  src={recipe.image}
                />
              ) : (
                <RecipeImagePlaceholder iconClassName="h-16 w-16" />
              )}
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border bg-plate-paper p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Used ingredients</p>
                <p className="mt-2 text-lg font-semibold text-plate-charcoal">{recipe.usedIngredientCount}</p>
              </div>
              <div className="rounded-xl border bg-plate-paper p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Missing ingredients</p>
                <p className="mt-2 text-lg font-semibold text-plate-charcoal">{recipe.missedIngredientCount}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <IngredientList
                ingredients={recipe.usedIngredients}
                title="Used ingredients"
                emptyMessage="No used ingredients listed."
                tone="default"
              />
              <IngredientList
                ingredients={recipe.missedIngredients}
                title="Missing ingredients"
                emptyMessage="No missing ingredients listed."
                tone="terracotta"
              />
            </div>

            <p id="pantry-recipe-preview-description" className="text-sm text-muted-foreground">
              Save this recipe to import full instructions and nutrition details into Plate Plan.
            </p>
          </div>

          <footer className="flex flex-col gap-2 border-t bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            {importMeta ? (
              <Link className="text-sm font-medium text-primary hover:underline" href={`/recipes/${importMeta.recipeId}`}>
                View saved recipe
              </Link>
            ) : null}
            <Button className="h-11 rounded-xl" type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button
              className="h-11 rounded-xl"
              disabled={recipe.missedIngredients.length === 0}
              type="button"
              variant="secondary"
              onClick={() => onAddMissing(recipe)}
            >
              Add missing ingredients
            </Button>
            <Button
              className="h-11 gap-2 rounded-xl"
              disabled={isSaving || isSaved}
              type="button"
              variant={isSaved ? "secondary" : "default"}
              onClick={() => onSave(recipe)}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : isSaved ? (
                importMeta?.alreadyImported ? "Already saved" : "Saved"
              ) : (
                "Save recipe"
              )}
            </Button>
          </footer>
        </>
      ) : null}
    </ModalShell>
  );
}

function IngredientList({
  title,
  ingredients,
  emptyMessage,
  tone,
}: {
  title: string;
  ingredients: NormalizedPantryRecipeResultIngredient[];
  emptyMessage: string;
  tone: "default" | "terracotta";
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-plate-charcoal">{title}</h3>
        <Badge variant={tone}>{ingredients.length}</Badge>
      </div>

      {ingredients.length > 0 ? (
        <ul className="space-y-2">
          {ingredients.map((ingredient, index) => (
            <li key={`${ingredient.name}-${index}`} className="rounded-xl border bg-white px-3 py-2 text-sm">
              <p className="font-medium text-plate-charcoal">{ingredient.name}</p>
              <p className="text-xs text-muted-foreground">{ingredient.original ?? formatIngredientAmount(ingredient)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed bg-plate-paper px-3 py-3 text-xs text-muted-foreground">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}

type ToastMessageProps = {
  toast: ToastState | null;
  onClose: () => void;
};

function ToastMessage({ toast, onClose }: ToastMessageProps) {
  if (!toast) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 z-[70] w-[min(24rem,calc(100vw-2rem))] rounded-2xl border bg-white p-4 shadow-soft lg:bottom-6">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            toast.variant === "success"
              ? "bg-primary/15 text-primary"
              : "bg-plate-terracotta/15 text-plate-terracotta",
          )}
        >
          {toast.variant === "success" ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-plate-charcoal">{toast.title}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{toast.message}</p>
          {toast.recipeId ? (
            <Link className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" href={`/recipes/${toast.recipeId}`}>
              Open recipe
              <ListChecks className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        <button
          aria-label="Close notification"
          className="rounded-md p-1 text-muted-foreground transition hover:bg-secondary hover:text-plate-charcoal"
          type="button"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function buildSelectablePantryIngredients(pantryItems: PantryItem[]): SelectablePantryIngredient[] {
  const byNormalizedName = new Map<string, SelectablePantryIngredient>();

  pantryItems.forEach((item) => {
    const trimmedName = item.name.trim();
    const normalizedName = normalizeIngredientName(trimmedName);

    if (!trimmedName || !normalizedName) {
      return;
    }

    const existing = byNormalizedName.get(normalizedName);

    if (!existing) {
      byNormalizedName.set(normalizedName, {
        key: normalizedName,
        name: trimmedName,
        category: item.category,
        isDefaultSelected: shouldDefaultSelectPantryItem({
          name: trimmedName,
          category: item.category,
        }),
      });
      return;
    }

    if (trimmedName.length < existing.name.length) {
      existing.name = trimmedName;
    }

    if (!existing.category && item.category) {
      existing.category = item.category;
    }

    if (!existing.isDefaultSelected) {
      existing.isDefaultSelected = shouldDefaultSelectPantryItem({
        name: existing.name,
        category: existing.category,
      });
    }
  });

  return Array.from(byNormalizedName.values()).sort((firstIngredient, secondIngredient) =>
    firstIngredient.name.localeCompare(secondIngredient.name),
  );
}

function toMissingOnlyComparison(
  missedIngredients: NormalizedPantryRecipeResultIngredient[],
): PantryComparisonResult {
  const missingMatches = missedIngredients.map((ingredient) =>
    toMissingIngredientMatch(ingredient),
  );

  return {
    ingredientMatches: missingMatches,
    availableIngredients: [],
    missingIngredients: missingMatches,
    partialIngredients: [],
    matchPercentage: 0,
    availableCount: 0,
    totalCount: missingMatches.length,
  };
}

function toMissingIngredientMatch(
  ingredient: NormalizedPantryRecipeResultIngredient,
): PantryIngredientMatch {
  return {
    ingredient: {
      quantity:
        typeof ingredient.amount === "number" && Number.isFinite(ingredient.amount)
          ? formatAmount(ingredient.amount)
          : "",
      unit: ingredient.unit ?? "",
      name: ingredient.name,
    },
    normalizedIngredientName: normalizeIngredientName(ingredient.name),
    pantryItem: null,
    status: "missing",
    reason: "not_found",
  };
}

function parsePositiveInteger(value: number | string) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function formatAmount(amount: number) {
  if (!Number.isFinite(amount)) {
    return "";
  }

  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/\.?0+$/, "");
}

function formatIngredientAmount(ingredient: NormalizedPantryRecipeResultIngredient) {
  const amount =
    typeof ingredient.amount === "number" && Number.isFinite(ingredient.amount)
      ? formatAmount(ingredient.amount)
      : "";

  return [amount, ingredient.unit].filter(Boolean).join(" ").trim() || "No amount listed";
}
