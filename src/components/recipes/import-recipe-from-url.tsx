"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  Save,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { collectMissingRequiredFields } from "@/lib/recipes/import/normalize-recipe";
import { cn } from "@/lib/utils";
import type { ImportedRecipeDraft } from "@/lib/recipes/import/types";

type ImportResponse = {
  recipe?: ImportedRecipeDraft;
  status?: "complete" | "partial";
  missingFields?: string[];
  message?: string;
  error?: string;
};

type SaveResponse = {
  recipe?: { id: string };
  error?: string;
};

type ToastState = {
  variant: "success" | "error" | "warning";
  title: string;
  message: string;
};

const LOADING_MESSAGES = [
  "Looking for the recipe…",
  "Pulling in ingredients and instructions…",
  "Getting your recipe ready to review…",
] as const;

export function ImportRecipeFromUrl() {
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);

  const [values, setValues] = useState<ImportedRecipeDraft | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const missingFields = useMemo(() => {
    if (!values) {
      return [];
    }

    return collectMissingRequiredFields(values);
  }, [values]);

  useEffect(() => {
    if (!isImporting) {
      return;
    }

    const interval = setInterval(() => {
      setLoadingIndex((current) => (current + 1) % LOADING_MESSAGES.length);
    }, 1400);

    return () => clearInterval(interval);
  }, [isImporting]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  function showToast(nextToast: ToastState) {
    setToast(nextToast);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => setToast(null), 4500);
  }

  async function handleImport() {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setImportError("That link doesn’t look valid. Try pasting the full recipe URL.");
      return;
    }

    setIsImporting(true);
    setLoadingIndex(0);
    setImportError(null);
    setSaveError(null);
    setValues(null);

    try {
      const response = await fetch("/api/recipes/import-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const payload = (await response.json().catch(() => ({}))) as ImportResponse;

      if (!response.ok || !payload.recipe) {
        setImportError(payload.error ?? "Couldn’t automatically import this recipe. You can still add it manually.");
        return;
      }

      setValues(payload.recipe);

      if (payload.status === "partial") {
        showToast({
          variant: "warning",
          title: "Partial import",
          message:
            payload.message ??
            "This recipe imported partially. Please review and fill in the missing details.",
        });
      } else {
        showToast({
          variant: "success",
          title: "Recipe imported",
          message: "Review and edit before saving to your library.",
        });
      }
    } catch {
      setImportError("Couldn’t automatically import this recipe. You can still add it manually.");
    } finally {
      setIsImporting(false);
    }
  }

  async function handleSave() {
    if (!values) {
      return;
    }

    if (missingFields.length > 0) {
      setSaveError("Please add a title, at least one ingredient, and at least one instruction step.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/recipes/save-imported", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const payload = (await response.json().catch(() => ({}))) as SaveResponse;

      if (!response.ok || !payload.recipe?.id) {
        setSaveError(payload.error ?? "Recipe could not be saved. Please try again.");
        showToast({
          variant: "error",
          title: "Save failed",
          message: payload.error ?? "Recipe could not be saved. Please try again.",
        });
        return;
      }

      showToast({
        variant: "success",
        title: "Recipe saved",
        message: "Your imported recipe is now in your library.",
      });

      router.push(`/recipes/${payload.recipe.id}`);
      router.refresh();
    } catch {
      setSaveError("Recipe could not be saved. Please try again.");
      showToast({
        variant: "error",
        title: "Save failed",
        message: "Recipe could not be saved. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function updateField<K extends keyof ImportedRecipeDraft>(field: K, nextValue: ImportedRecipeDraft[K]) {
    setValues((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: nextValue,
      };
    });
  }

  function updateIngredient(index: number, nextValue: string) {
    setValues((current) => {
      if (!current) {
        return current;
      }

      const nextIngredients = current.ingredients.map((ingredient, ingredientIndex) =>
        ingredientIndex === index ? nextValue : ingredient,
      );

      return {
        ...current,
        ingredients: nextIngredients,
      };
    });
  }

  function removeIngredient(index: number) {
    setValues((current) => {
      if (!current) {
        return current;
      }

      const remaining = current.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index);

      return {
        ...current,
        ingredients: remaining,
      };
    });
  }

  function addIngredient() {
    setValues((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        ingredients: [...current.ingredients, ""],
      };
    });
  }

  function updateInstruction(index: number, nextValue: string) {
    setValues((current) => {
      if (!current) {
        return current;
      }

      const nextInstructions = current.instructions.map((instruction, instructionIndex) =>
        instructionIndex === index ? nextValue : instruction,
      );

      return {
        ...current,
        instructions: nextInstructions,
      };
    });
  }

  function removeInstruction(index: number) {
    setValues((current) => {
      if (!current) {
        return current;
      }

      const remaining = current.instructions.filter((_, instructionIndex) => instructionIndex !== index);

      return {
        ...current,
        instructions: remaining,
      };
    });
  }

  function addInstruction() {
    setValues((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        instructions: [...current.instructions, ""],
      };
    });
  }

  function resetImport() {
    setValues(null);
    setSaveError(null);
    setImportError(null);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-5 shadow-subtle sm:p-6">
        <Badge variant="blue">Recipe import</Badge>
        <h1 className="mt-3 text-3xl font-semibold text-gravy-charcoal">Import Recipe</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Paste a recipe link and gravytime will try to pull in the ingredients and instructions.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Found something tasty online? Paste the recipe link below.
        </p>

        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleImport();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="recipe-import-url">Recipe URL</Label>
            <Input
              id="recipe-import-url"
              className="h-12"
              placeholder="https://example.com/my-favorite-recipe"
              value={url}
              disabled={isImporting}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button className="h-11 w-full gap-2 sm:w-auto" type="submit" disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Importing...
                </>
              ) : (
                "Import Recipe"
              )}
            </Button>
            <Link className={cn(buttonVariants({ variant: "secondary" }), "h-11 w-full sm:w-auto")} href="/recipes/new">
              Add recipe manually
            </Link>
          </div>
        </form>

        {isImporting ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed bg-gravy-paper px-3 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {LOADING_MESSAGES[loadingIndex]}
          </div>
        ) : null}

        {importError ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{importError}</p>
          </div>
        ) : null}
      </section>

      {values ? (
        <section className="space-y-5 rounded-2xl border bg-card p-5 shadow-subtle sm:p-6">
          <div>
            <h2 className="text-2xl font-semibold text-gravy-charcoal">Review Imported Recipe</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Always check imported recipes for accuracy before saving.
            </p>
            {missingFields.length > 0 ? (
              <p className="mt-2 text-sm text-gravy-brown">
                Missing fields: {missingFields.join(", ")}. Please fill these in before saving.
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-gravy-gold/25 bg-gravy-gold/10 p-3 text-sm text-gravy-brown">
            <p className="font-medium">
              Imported from {values.sourceName ?? "source website"}
            </p>
            <a
              className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:underline"
              href={values.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {values.sourceUrl}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="imported-title">Title</Label>
              <Input
                id="imported-title"
                value={values.title}
                onChange={(event) => updateField("title", event.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="imported-description">Description</Label>
              <Textarea
                id="imported-description"
                value={values.description ?? ""}
                onChange={(event) => updateField("description", event.target.value || null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imported-servings">Servings</Label>
              <Input
                id="imported-servings"
                type="number"
                min={1}
                value={values.servings ?? ""}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  updateField("servings", Number.isFinite(next) && next > 0 ? next : null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imported-prep">Prep time (minutes)</Label>
              <Input
                id="imported-prep"
                type="number"
                min={0}
                value={values.prepTimeMinutes ?? ""}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  updateField("prepTimeMinutes", Number.isFinite(next) && next >= 0 ? next : null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imported-cook">Cook time (minutes)</Label>
              <Input
                id="imported-cook"
                type="number"
                min={0}
                value={values.cookTimeMinutes ?? ""}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  updateField("cookTimeMinutes", Number.isFinite(next) && next >= 0 ? next : null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imported-total">Total time (minutes)</Label>
              <Input
                id="imported-total"
                type="number"
                min={0}
                value={values.totalTimeMinutes ?? ""}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  updateField("totalTimeMinutes", Number.isFinite(next) && next >= 0 ? next : null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imported-category">Category</Label>
              <Input
                id="imported-category"
                value={values.category ?? ""}
                onChange={(event) => updateField("category", event.target.value || null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imported-cuisine">Cuisine</Label>
              <Input
                id="imported-cuisine"
                value={values.cuisine ?? ""}
                onChange={(event) => updateField("cuisine", event.target.value || null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imported-author">Author</Label>
              <Input
                id="imported-author"
                value={values.author ?? ""}
                onChange={(event) => updateField("author", event.target.value || null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imported-image">Image URL</Label>
              <Input
                id="imported-image"
                value={values.imageUrl ?? ""}
                onChange={(event) => updateField("imageUrl", event.target.value || null)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="imported-tags">Tags (comma separated)</Label>
              <Input
                id="imported-tags"
                value={(values.tags ?? []).join(", ")}
                onChange={(event) => {
                  const tags = event.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean);
                  updateField("tags", tags);
                }}
              />
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-gravy-charcoal">Ingredients</h3>
              <Button type="button" variant="secondary" className="gap-2" onClick={addIngredient}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add ingredient
              </Button>
            </div>

            <div className="space-y-2">
              {values.ingredients.map((ingredient, index) => (
                <div key={`ingredient-${index}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_40px]">
                  <Input
                    aria-label={`Ingredient ${index + 1}`}
                    value={ingredient}
                    onChange={(event) => updateIngredient(index, event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Remove ingredient ${index + 1}`}
                    className="h-10 w-10 px-0"
                    onClick={() => removeIngredient(index)}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-gravy-charcoal">Instructions</h3>
              <Button type="button" variant="secondary" className="gap-2" onClick={addInstruction}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add step
              </Button>
            </div>

            <div className="space-y-2">
              {values.instructions.map((instruction, index) => (
                <div key={`instruction-${index}`} className="grid gap-2 sm:grid-cols-[40px_minmax(0,1fr)_40px]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <Textarea
                    aria-label={`Instruction step ${index + 1}`}
                    className="min-h-20"
                    value={instruction}
                    onChange={(event) => updateInstruction(index, event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Remove step ${index + 1}`}
                    className="h-10 w-10 px-0"
                    onClick={() => removeInstruction(index)}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {saveError ? (
            <section className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm text-destructive">
              {saveError}
            </section>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              className="h-11 w-full gap-2 sm:w-auto"
              disabled={isSaving || missingFields.length > 0}
              onClick={() => void handleSave()}
              type="button"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save Recipe
                </>
              )}
            </Button>

            <Button className="h-11 w-full sm:w-auto" type="button" variant="secondary" onClick={resetImport}>
              Try another link
            </Button>

            <Link className={cn(buttonVariants({ variant: "secondary" }), "h-11 w-full sm:w-auto")} href="/recipes/new">
              Add manually
            </Link>
          </div>
        </section>
      ) : null}

      <ToastMessage toast={toast} onClose={() => setToast(null)} />
    </div>
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
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(6.4rem+env(safe-area-inset-bottom))] z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:justify-end">
      <div className="pointer-events-auto w-full max-w-sm rounded-xl border bg-card px-4 py-3 shadow-soft">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              toast.variant === "success"
                ? "bg-primary/15 text-primary"
                : toast.variant === "warning"
                  ? "bg-gravy-gold/20 text-gravy-brown"
                  : "bg-destructive/15 text-destructive",
            )}
          >
            {toast.variant === "success" ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gravy-charcoal">{toast.title}</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{toast.message}</p>
          </div>
          <button
            aria-label="Dismiss message"
            className="rounded-md p-1 text-muted-foreground transition hover:bg-secondary"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
