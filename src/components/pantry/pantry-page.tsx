"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Box, Filter, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { FindRecipesFromPantry } from "@/components/pantry/find-recipes-from-pantry";
import { AddMissingIngredientsModal } from "@/components/recipes/add-missing-ingredients-modal";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { Textarea } from "@/components/ui/textarea";
import { normalizeIngredientName } from "@/lib/ingredients";
import {
  compareRecipeToPantry,
  createPantryItem,
  deletePantryItem,
  getPantryMatchScore,
  updatePantryItem,
} from "@/lib/pantry";
import { parseIngredients } from "@/lib/recipes";
import { cn } from "@/lib/utils";
import {
  PANTRY_CATEGORIES,
  PANTRY_LOCATIONS,
  type PantryCategory,
  type PantryComparisonResult,
  type PantryItem,
  type PantryLocation,
} from "@/types/pantry";
import type { Recipe } from "@/types/recipes";

type PantryPageProps = {
  initialPantryItems: PantryItem[];
  recipes: Recipe[];
  userId: string;
};

type GroupByMode = "location" | "category";

type PantryFormState = {
  name: string;
  quantity: string;
  unit: string;
  category: string;
  location: string;
  notes: string;
  isStaple: boolean;
  lowStockThreshold: string;
};

type PantryRecommendation = {
  recipe: Recipe;
  comparison: PantryComparisonResult;
  matchScore: number;
  missingPreview: string[];
};

const defaultQuickAddValues = {
  name: "",
  quantity: "",
  unit: "",
  category: "",
  location: "",
};

const defaultPantryFormValues: PantryFormState = {
  name: "",
  quantity: "",
  unit: "",
  category: "",
  location: "",
  notes: "",
  isStaple: false,
  lowStockThreshold: "",
};

export function PantryPage({ initialPantryItems, recipes, userId }: PantryPageProps) {
  const [pantryItems, setPantryItems] = useState<PantryItem[]>(initialPantryItems);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<GroupByMode>("location");
  const [quickAddValues, setQuickAddValues] = useState(defaultQuickAddValues);
  const [isSavingQuickAdd, setIsSavingQuickAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [pantryFormValues, setPantryFormValues] = useState<PantryFormState>(defaultPantryFormValues);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormSaving, setIsFormSaving] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<PantryRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeIngredientName(query);

    return pantryItems.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        item.normalized_name.includes(normalizedQuery) ||
        item.name.toLowerCase().includes(query.trim().toLowerCase());

      if (!matchesQuery) {
        return false;
      }

      if (categoryFilter !== "all" && (item.category ?? "") !== categoryFilter) {
        return false;
      }

      if (locationFilter !== "all" && (item.location ?? "") !== locationFilter) {
        return false;
      }

      return true;
    });
  }, [categoryFilter, locationFilter, pantryItems, query]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, PantryItem[]>();

    for (const item of filteredItems) {
      const rawKey = groupBy === "location" ? item.location : item.category;
      const key = rawKey?.trim() || "Other";
      const currentItems = groups.get(key) ?? [];
      groups.set(key, [...currentItems, item]);
    }

    return Array.from(groups.entries())
      .sort((firstGroup, secondGroup) => sortGroupKeys(groupBy, firstGroup[0], secondGroup[0]))
      .map(([key, items]) => ({
        key,
        items: [...items].sort((firstItem, secondItem) => firstItem.name.localeCompare(secondItem.name)),
      }));
  }, [filteredItems, groupBy]);

  const recommendations = useMemo(() => {
    return recipes
      .map<PantryRecommendation>((recipe) => {
        const recipeIngredients = parseIngredients(recipe.ingredients);
        const comparison = compareRecipeToPantry(recipeIngredients, pantryItems);

        return {
          recipe,
          comparison,
          matchScore: getPantryMatchScore(recipeIngredients, pantryItems),
          missingPreview: comparison.missingIngredients
            .map((match) => match.ingredient.name)
            .filter(Boolean)
            .slice(0, 3),
        };
      })
      .filter((recommendation) => recommendation.comparison.totalCount > 0)
      .sort((firstRecommendation, secondRecommendation) => {
        if (secondRecommendation.matchScore !== firstRecommendation.matchScore) {
          return secondRecommendation.matchScore - firstRecommendation.matchScore;
        }

        if (
          secondRecommendation.comparison.availableCount !== firstRecommendation.comparison.availableCount
        ) {
          return (
            secondRecommendation.comparison.availableCount -
            firstRecommendation.comparison.availableCount
          );
        }

        return firstRecommendation.recipe.title.localeCompare(secondRecommendation.recipe.title);
      });
  }, [pantryItems, recipes]);

  async function handleQuickAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = quickAddValues.name.trim();

    if (!cleanName) {
      setError("Item name is required.");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSavingQuickAdd(true);

    const temporaryId = `temp-${Date.now()}`;
    const temporaryItem = createTemporaryPantryItem({
      id: temporaryId,
      name: cleanName,
      quantity: quickAddValues.quantity,
      unit: quickAddValues.unit,
      category: quickAddValues.category,
      location: quickAddValues.location,
    });

    setPantryItems((currentItems) => [temporaryItem, ...currentItems]);

    try {
      const createdItem = await createPantryItem({
        userId,
        item: {
          name: cleanName,
          quantity: quickAddValues.quantity,
          unit: quickAddValues.unit,
          category: quickAddValues.category,
          location: quickAddValues.location,
        },
      });

      setPantryItems((currentItems) =>
        currentItems.map((item) => (item.id === temporaryId ? createdItem : item)),
      );
      setQuickAddValues(defaultQuickAddValues);
      setNotice(`${createdItem.name} was added to your pantry.`);
    } catch (createError) {
      setPantryItems((currentItems) => currentItems.filter((item) => item.id !== temporaryId));
      setError(getErrorMessage(createError, "Pantry item could not be added."));
    } finally {
      setIsSavingQuickAdd(false);
    }
  }

  function openAddDetailsForm() {
    setEditingItem(null);
    setPantryFormValues(defaultPantryFormValues);
    setIsFormOpen(true);
    setError(null);
    setNotice(null);
  }

  function openEditForm(item: PantryItem) {
    setEditingItem(item);
    setPantryFormValues({
      name: item.name,
      quantity: item.quantity !== null ? String(item.quantity) : "",
      unit: item.unit ?? "",
      category: item.category ?? "",
      location: item.location ?? "",
      notes: item.notes ?? "",
      isStaple: Boolean(item.is_staple),
      lowStockThreshold: item.low_stock_threshold !== null ? String(item.low_stock_threshold) : "",
    });
    setIsFormOpen(true);
    setError(null);
    setNotice(null);
  }

  async function handleSavePantryForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = pantryFormValues.name.trim();

    if (!cleanName) {
      setError("Item name is required.");
      return;
    }

    setIsFormSaving(true);
    setError(null);
    setNotice(null);

    if (editingItem) {
      const previousItem = editingItem;
      const optimisticItem: PantryItem = {
        ...editingItem,
        name: cleanName,
        normalized_name: normalizeIngredientName(cleanName),
        quantity: parseNullableNumber(pantryFormValues.quantity),
        unit: toNullableText(pantryFormValues.unit),
        category: toNullableText(pantryFormValues.category),
        location: toNullableText(pantryFormValues.location),
        notes: toNullableText(pantryFormValues.notes),
        is_staple: pantryFormValues.isStaple,
        low_stock_threshold: parseNullableNumber(pantryFormValues.lowStockThreshold),
      };

      setPantryItems((currentItems) =>
        currentItems.map((item) => (item.id === editingItem.id ? optimisticItem : item)),
      );

      try {
        const updatedItem = await updatePantryItem({
          id: editingItem.id,
          userId,
          updates: {
            name: cleanName,
            quantity: pantryFormValues.quantity,
            unit: pantryFormValues.unit,
            category: pantryFormValues.category,
            location: pantryFormValues.location,
            notes: pantryFormValues.notes,
            is_staple: pantryFormValues.isStaple,
            low_stock_threshold: pantryFormValues.lowStockThreshold,
          },
        });

        setPantryItems((currentItems) =>
          currentItems.map((item) => (item.id === editingItem.id ? updatedItem : item)),
        );
        setNotice(`${updatedItem.name} was updated.`);
        setIsFormOpen(false);
      } catch (updateError) {
        setPantryItems((currentItems) =>
          currentItems.map((item) => (item.id === previousItem.id ? previousItem : item)),
        );
        setError(getErrorMessage(updateError, "Pantry item could not be updated."));
      } finally {
        setIsFormSaving(false);
      }

      return;
    }

    try {
      const createdItem = await createPantryItem({
        userId,
        item: {
          name: cleanName,
          quantity: pantryFormValues.quantity,
          unit: pantryFormValues.unit,
          category: pantryFormValues.category,
          location: pantryFormValues.location,
          notes: pantryFormValues.notes,
          is_staple: pantryFormValues.isStaple,
          low_stock_threshold: pantryFormValues.lowStockThreshold,
        },
      });

      setPantryItems((currentItems) => [createdItem, ...currentItems]);
      setNotice(`${createdItem.name} was added to your pantry.`);
      setIsFormOpen(false);
    } catch (createError) {
      setError(getErrorMessage(createError, "Pantry item could not be added."));
    } finally {
      setIsFormSaving(false);
    }
  }

  async function handleDeleteItem(item: PantryItem) {
    const shouldDelete = window.confirm(`Delete ${item.name} from pantry?`);

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsDeletingId(item.id);

    setPantryItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id));

    try {
      await deletePantryItem({ id: item.id, userId });
      setNotice(`${item.name} was removed from your pantry.`);
    } catch (deleteError) {
      setPantryItems((currentItems) =>
        currentItems.some((currentItem) => currentItem.id === item.id)
          ? currentItems
          : [item, ...currentItems],
      );
      setError(getErrorMessage(deleteError, "Pantry item could not be deleted."));
    } finally {
      setIsDeletingId(null);
    }
  }

  const hasFilters = query.trim().length > 0 || categoryFilter !== "all" || locationFilter !== "all";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="default">Pantry inventory</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-plate-charcoal sm:text-4xl">
            Pantry
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Track what you already have so meal planning and grocery runs stay focused.
          </p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-subtle">
          <Box className="h-7 w-7" aria-hidden="true" />
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-subtle sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-plate-charcoal">Quick add</h2>
          <Button className="h-10 rounded-xl" type="button" variant="secondary" onClick={openAddDetailsForm}>
            Add with details
          </Button>
        </div>

        <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-7" onSubmit={handleQuickAdd}>
          <Input
            required
            value={quickAddValues.name}
            placeholder="Item name"
            className="lg:col-span-2"
            disabled={isSavingQuickAdd}
            onChange={(event) =>
              setQuickAddValues((currentValues) => ({ ...currentValues, name: event.target.value }))
            }
          />
          <Input
            value={quickAddValues.quantity}
            placeholder="Qty"
            disabled={isSavingQuickAdd}
            onChange={(event) =>
              setQuickAddValues((currentValues) => ({ ...currentValues, quantity: event.target.value }))
            }
          />
          <Input
            value={quickAddValues.unit}
            placeholder="Unit"
            disabled={isSavingQuickAdd}
            onChange={(event) =>
              setQuickAddValues((currentValues) => ({ ...currentValues, unit: event.target.value }))
            }
          />
          <select
            className="flex h-11 rounded-md border border-input bg-plate-paper px-3 py-2 text-sm text-plate-charcoal shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            value={quickAddValues.category}
            disabled={isSavingQuickAdd}
            onChange={(event) =>
              setQuickAddValues((currentValues) => ({ ...currentValues, category: event.target.value }))
            }
          >
            <option value="">Category</option>
            {PANTRY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            className="flex h-11 rounded-md border border-input bg-plate-paper px-3 py-2 text-sm text-plate-charcoal shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            value={quickAddValues.location}
            disabled={isSavingQuickAdd}
            onChange={(event) =>
              setQuickAddValues((currentValues) => ({ ...currentValues, location: event.target.value }))
            }
          >
            <option value="">Location</option>
            {PANTRY_LOCATIONS.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
          <Button className="h-11 gap-2 rounded-xl" disabled={isSavingQuickAdd} type="submit">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {isSavingQuickAdd ? "Adding..." : "Add item"}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-subtle sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,180px))]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              className="pl-10"
              placeholder="Search pantry items"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <select
            className="flex h-11 rounded-md border border-input bg-plate-paper px-3 py-2 text-sm text-plate-charcoal shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">All categories</option>
            {PANTRY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            className="flex h-11 rounded-md border border-input bg-plate-paper px-3 py-2 text-sm text-plate-charcoal shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
          >
            <option value="all">All locations</option>
            {PANTRY_LOCATIONS.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 rounded-md border border-input bg-plate-paper px-3 py-2">
            <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <label className="sr-only" htmlFor="pantry-group-by">
              Group pantry items by
            </label>
            <select
              id="pantry-group-by"
              className="w-full bg-transparent text-sm text-plate-charcoal focus-visible:outline-none"
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value as GroupByMode)}
            >
              <option value="location">Group by location</option>
              <option value="category">Group by category</option>
            </select>
          </div>
        </div>
      </section>

      {error ? (
        <div
          className="rounded-2xl border border-plate-terracotta/30 bg-plate-terracotta/10 px-4 py-3 text-sm text-plate-terracotta"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {notice ? (
        <div
          className="rounded-2xl border border-plate-blue/25 bg-plate-blue/10 px-4 py-3 text-sm text-plate-blue"
          role="status"
        >
          {notice}
        </div>
      ) : null}

      {filteredItems.length === 0 ? (
        <section className="rounded-2xl border border-dashed bg-white p-8 text-center shadow-subtle">
          <Badge variant="terracotta">Pantry starter</Badge>
          <h2 className="mt-4 text-xl font-semibold text-plate-charcoal">
            {hasFilters ? "No pantry items match your filters." : "Your pantry is empty."}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {hasFilters
              ? "Try a different search term or filter combination."
              : "Add items you already have so Plate Plan can help you build meals and smarter grocery lists."}
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          {groupedItems.map((group) => (
            <section key={group.key}>
              <h2 className="mb-3 text-lg font-semibold text-plate-charcoal">{group.key}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((item) => (
                  <article key={item.id} className="rounded-2xl border bg-white p-4 shadow-subtle">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-plate-charcoal">{item.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatItemAmount(item) || "Quantity optional"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          aria-label={`Edit ${item.name}`}
                          className="h-9 w-9 rounded-lg px-0"
                          type="button"
                          variant="secondary"
                          onClick={() => openEditForm(item)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          aria-label={`Delete ${item.name}`}
                          className="h-9 w-9 rounded-lg px-0 text-plate-terracotta hover:bg-plate-terracotta/10 hover:text-plate-terracotta"
                          disabled={isDeletingId === item.id}
                          type="button"
                          variant="ghost"
                          onClick={() => handleDeleteItem(item)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="blue">{item.location ?? "Other"}</Badge>
                      <Badge variant="neutral">{item.category ?? "Other"}</Badge>
                      {item.is_staple ? <Badge variant="default">Staple</Badge> : null}
                    </div>

                    {item.low_stock_threshold !== null ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Low stock at {item.low_stock_threshold}
                        {item.unit ? ` ${item.unit}` : ""}
                      </p>
                    ) : null}

                    {item.notes ? (
                      <p className="mt-3 rounded-xl bg-plate-paper px-3 py-2 text-xs text-muted-foreground">
                        {item.notes}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <FindRecipesFromPantry pantryItems={pantryItems} userId={userId} />

      <section className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge variant="blue">Cook from Pantry</Badge>
            <h2 className="mt-3 text-2xl font-semibold text-plate-charcoal">What you can cook now</h2>
          </div>
        </div>

        {pantryItems.length === 0 || recipes.length === 0 || recommendations.length === 0 ? (
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Add pantry items and saved recipes to see what you can cook.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommendations.slice(0, 9).map((recommendation) => (
              <article key={recommendation.recipe.id} className="rounded-2xl border bg-plate-paper p-4">
                <h3 className="text-base font-semibold text-plate-charcoal">{recommendation.recipe.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {recommendation.comparison.availableCount}/{recommendation.comparison.totalCount} ingredients
                  available
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {recommendation.comparison.missingIngredients.length} missing
                </p>

                {recommendation.missingPreview.length > 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Missing: {recommendation.missingPreview.join(", ")}
                    {recommendation.comparison.missingIngredients.length > recommendation.missingPreview.length
                      ? "..."
                      : ""}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={recommendation.matchScore >= 90 ? "default" : "blue"}>
                    {recommendation.matchScore}% pantry match
                  </Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    className={cn(buttonVariants({ variant: "secondary" }), "h-10 rounded-xl")}
                    href={`/recipes/${recommendation.recipe.id}`}
                  >
                    View recipe
                  </Link>
                  <Button
                    className="h-10 rounded-xl"
                    type="button"
                    onClick={() => setSelectedRecommendation(recommendation)}
                  >
                    Add missing to grocery list
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <PantryItemFormModal
        formValues={pantryFormValues}
        isEditing={Boolean(editingItem)}
        isOpen={isFormOpen}
        isSaving={isFormSaving}
        onClose={() => {
          if (isFormSaving) {
            return;
          }

          setIsFormOpen(false);
        }}
        onFormValuesChange={setPantryFormValues}
        onSubmit={handleSavePantryForm}
      />

      {selectedRecommendation ? (
        <AddMissingIngredientsModal
          isOpen={Boolean(selectedRecommendation)}
          recipeTitle={selectedRecommendation.recipe.title}
          comparison={selectedRecommendation.comparison}
          userId={userId}
          onItemsAdded={(count) => {
            setNotice(
              `Added ${count} ingredient${count === 1 ? "" : "s"} from ${selectedRecommendation.recipe.title} to this week's grocery list.`,
            );
          }}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedRecommendation(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function PantryItemFormModal({
  isOpen,
  isEditing,
  isSaving,
  formValues,
  onFormValuesChange,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  isEditing: boolean;
  isSaving: boolean;
  formValues: PantryFormState;
  onFormValuesChange: (values: PantryFormState) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <ModalShell
      isOpen={isOpen}
      labelledBy="pantry-item-form-title"
      describedBy="pantry-item-form-description"
      panelClassName="max-w-xl"
      onClose={onClose}
    >
      <form onSubmit={onSubmit}>
        <header className="border-b bg-white px-4 py-4 sm:px-6">
          <Badge variant="default">Pantry item</Badge>
          <h2 id="pantry-item-form-title" className="mt-2 text-xl font-semibold text-plate-charcoal">
            {isEditing ? "Edit pantry item" : "Add pantry item"}
          </h2>
          <p id="pantry-item-form-description" className="mt-1 text-sm text-muted-foreground">
            Name is required. Quantity details are optional.
          </p>
        </header>

        <div className="space-y-4 px-4 py-5 sm:px-6">
          <div className="space-y-2">
            <Label htmlFor="pantryItemName">Item name</Label>
            <Input
              id="pantryItemName"
              autoFocus
              required
              value={formValues.name}
              placeholder="Chicken breast"
              disabled={isSaving}
              onChange={(event) => onFormValuesChange({ ...formValues, name: event.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pantryItemQuantity">Quantity</Label>
              <Input
                id="pantryItemQuantity"
                value={formValues.quantity}
                placeholder="2"
                disabled={isSaving}
                onChange={(event) =>
                  onFormValuesChange({ ...formValues, quantity: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pantryItemUnit">Unit</Label>
              <Input
                id="pantryItemUnit"
                value={formValues.unit}
                placeholder="lb"
                disabled={isSaving}
                onChange={(event) => onFormValuesChange({ ...formValues, unit: event.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pantryItemCategory">Category</Label>
              <select
                id="pantryItemCategory"
                className="flex h-11 w-full rounded-md border border-input bg-plate-paper px-3 py-2 text-sm text-plate-charcoal shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                value={formValues.category}
                disabled={isSaving}
                onChange={(event) =>
                  onFormValuesChange({ ...formValues, category: event.target.value as PantryCategory | "" })
                }
              >
                <option value="">None</option>
                {PANTRY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pantryItemLocation">Location</Label>
              <select
                id="pantryItemLocation"
                className="flex h-11 w-full rounded-md border border-input bg-plate-paper px-3 py-2 text-sm text-plate-charcoal shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                value={formValues.location}
                disabled={isSaving}
                onChange={(event) =>
                  onFormValuesChange({ ...formValues, location: event.target.value as PantryLocation | "" })
                }
              >
                <option value="">None</option>
                {PANTRY_LOCATIONS.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pantryItemLowStock">Low stock threshold (optional)</Label>
            <Input
              id="pantryItemLowStock"
              value={formValues.lowStockThreshold}
              placeholder="1"
              disabled={isSaving}
              onChange={(event) =>
                onFormValuesChange({ ...formValues, lowStockThreshold: event.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pantryItemNotes">Notes</Label>
            <Textarea
              id="pantryItemNotes"
              value={formValues.notes}
              placeholder="Any prep notes or purchase reminders"
              disabled={isSaving}
              onChange={(event) => onFormValuesChange({ ...formValues, notes: event.target.value })}
            />
          </div>

          <label className="flex items-center gap-3 rounded-xl border bg-plate-paper px-3 py-2">
            <input
              type="checkbox"
              checked={formValues.isStaple}
              disabled={isSaving}
              onChange={(event) =>
                onFormValuesChange({ ...formValues, isStaple: event.target.checked })
              }
            />
            <span className="text-sm font-medium text-plate-charcoal">Mark as staple item</span>
          </label>
        </div>

        <footer className="flex flex-col gap-2 border-t bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button
            className="h-11 rounded-xl"
            disabled={isSaving}
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button className="h-11 gap-2 rounded-xl" disabled={isSaving} type="submit">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {isSaving ? "Saving..." : isEditing ? "Save changes" : "Add pantry item"}
          </Button>
        </footer>
      </form>
    </ModalShell>
  );
}

function formatItemAmount(item: Pick<PantryItem, "quantity" | "unit">) {
  if (item.quantity === null) {
    return item.unit ?? "";
  }

  return [formatDecimal(item.quantity), item.unit].filter(Boolean).join(" ").trim();
}

function formatDecimal(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function createTemporaryPantryItem({
  id,
  name,
  quantity,
  unit,
  category,
  location,
}: {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  category: string;
  location: string;
}): PantryItem {
  return {
    id,
    user_id: "temporary",
    household_id: null,
    name,
    normalized_name: normalizeIngredientName(name),
    quantity: parseNullableNumber(quantity),
    unit: toNullableText(unit),
    category: toNullableText(category),
    location: toNullableText(location),
    notes: null,
    is_staple: false,
    low_stock_threshold: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function parseNullableNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsedValue = Number.parseFloat(value.trim());
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function toNullableText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value.trim();
  return cleanValue ? cleanValue : null;
}

function sortGroupKeys(groupBy: GroupByMode, firstKey: string, secondKey: string) {
  const order = groupBy === "location" ? PANTRY_LOCATIONS : PANTRY_CATEGORIES;
  const firstIndex = order.findIndex((groupName) => groupName === firstKey);
  const secondIndex = order.findIndex((groupName) => groupName === secondKey);

  if (firstIndex === -1 || secondIndex === -1) {
    return firstKey.localeCompare(secondKey);
  }

  return firstIndex - secondIndex;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}
