"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ExternalLink, Loader2, Plus, Save, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMissingRequiredFieldLabels } from "@/lib/recipes/import/normalize-recipe";
import type { ImportMethod, ImportedRecipeDraft } from "@/lib/recipes/import/types";

const LOADING_PHASE_DELAY_MS = 1100;

type ImportUrlApiResponse = {
  draft?: ImportedRecipeDraft;
  importMethod?: ImportMethod;
  warning?: string;
  error?: string;
};

type SaveImportedRecipeApiResponse = {
  recipeId?: string;
  redirectTo?: string;
  error?: string;
};

type ImportedRecipeDraftForm = {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTimeMinutes: string;
  cookTimeMinutes: string;
  totalTimeMinutes: string;
  servings: string;
  imageUrl: string;
  sourceUrl: string;
  sourceName: string;
  author: string;
  cuisine: string;
  category: string;
  tags: string;
  importMethod: ImportMethod;
};

export function ImportRecipeFromUrl() {
  const router = useRouter();
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [urlInput, setUrlInput] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importWarning, setImportWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<"finding" | "extracting">("finding");
  const [form, setForm] = useState<ImportedRecipeDraftForm | null>(null);

  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, []);

  const draft = useMemo(() => (form ? formToDraft(form) : null), [form]);
  const missingFields = useMemo(() => (draft ? getMissingRequiredFieldLabels(draft) : []), [draft]);
  const saveDisabled = isSaving || !draft || missingFields.length > 0;

  const loadingCopy = loadingPhase === "finding"
    ? "Looking for the recipe..."
    : "Pulling in ingredients and instructions...";

  async function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setImportError(null);
    setImportWarning(null);
    setSaveError(null);

    const cleanedUrl = urlInput.trim();

    if (!cleanedUrl) {
      setImportError("That link doesn't look valid. Try pasting the full recipe URL.");
      return;
    }

    setIsImporting(true);
    setLoadingPhase("finding");

    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }

    loadingTimerRef.current = setTimeout(() => {
      setLoadingPhase("extracting");
    }, LOADING_PHASE_DELAY_MS);

    try {
      const response = await fetch("/api/recipes/import-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: cleanedUrl }),
      });

      const payload = (await response.json().catch(() => ({}))) as ImportUrlApiResponse;

      if (!response.ok || !payload.draft) {
        setImportError(
          payload.error ?? "Couldn't automatically import this recipe. You can still add it manually.",
        );
        return;
      }

      setForm(draftToForm(payload.draft));
      setImportWarning(payload.warning ?? null);
      setUrlInput(payload.draft.sourceUrl);
    } catch {
      setImportError("Could not connect to recipe import. Please try again.");
    } finally {
      setIsImporting(false);

      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    }
  }

  async function handleSave() {
    if (!draft) {
      return;
    }

    setSaveError(null);
    setSaveSuccessMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/recipes/save-imported", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ draft }),
      });

      const payload = (await response.json().catch(() => ({}))) as SaveImportedRecipeApiResponse;

      if (!response.ok || !payload.redirectTo) {
        setSaveError(payload.error ?? "Recipe could not be saved. Please try again.");
        return;
      }

      setSaveSuccessMessage("Recipe saved successfully. Opening your recipe...");
      await wait(450);
      router.push(payload.redirectTo);
      router.refresh();
    } catch {
      setSaveError("Recipe could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function updateField<K extends keyof ImportedRecipeDraftForm>(
    field: K,
    value: ImportedRecipeDraftForm[K],
  ) {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  }

  function updateIngredient(index: number, value: string) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        ingredients: current.ingredients.map((ingredient, ingredientIndex) =>
          ingredientIndex === index ? value : ingredient,
        ),
      };
    });
  }

  function addIngredient() {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        ingredients: [...current.ingredients, ""],
      };
    });
  }

  function removeIngredient(index: number) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        ingredients: current.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index),
      };
    });
  }

  function updateInstruction(index: number, value: string) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        instructions: current.instructions.map((instruction, instructionIndex) =>
          instructionIndex === index ? value : instruction,
        ),
      };
    });
  }

  function addInstruction() {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        instructions: [...current.instructions, ""],
      };
    });
  }

  function removeInstruction(index: number) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        instructions: current.instructions.filter((_, instructionIndex) => instructionIndex !== index),
      };
    });
  }

  return (
    <div className="space-y-6">
      <form className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-6" onSubmit={(event) => void handleImport(event)}>
        <Badge variant="blue">Import from URL</Badge>
        <h2 className="mt-3 text-2xl font-semibold text-plate-charcoal">Import Recipe</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Paste a recipe link and gravytime will try to pull in the ingredients and instructions.
        </p>

        <div className="mt-4 space-y-3">
          <Label htmlFor="recipe-url-input">Recipe URL</Label>
          <Input
            id="recipe-url-input"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://example.com/recipe"
            value={urlInput}
            disabled={isImporting || isSaving}
            onChange={(event) => setUrlInput(event.target.value)}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button className="h-11 w-full gap-2 sm:w-auto" disabled={isImporting || isSaving} type="submit">
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {loadingCopy}
                </>
              ) : (
                "Import Recipe"
              )}
            </Button>
            <Link className="text-sm font-medium text-primary hover:underline" href="/recipes/new">
              Add Manually
            </Link>
          </div>
        </div>
      </form>

      {importError ? (
        <div className="rounded-2xl border border-plate-terracotta/35 bg-plate-terracotta/10 p-4 text-sm text-plate-terracotta" role="alert">
          {importError}
        </div>
      ) : null}

      {form ? (
        <section className="space-y-6">
          <div className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge variant={form.importMethod === "spoonacular" ? "blue" : "default"}>
                  Review Recipe
                </Badge>
                <h3 className="mt-3 text-2xl font-semibold text-plate-charcoal">Review before saving</h3>
              </div>
              <Button className="h-11 w-full gap-2 sm:w-auto" disabled={saveDisabled} onClick={() => void handleSave()}>
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
            </div>

            <div className="mt-4 space-y-3">
              <p className="rounded-xl border bg-plate-paper px-3 py-2 text-sm text-muted-foreground">
                Always check imported recipes for accuracy before saving.
              </p>
              <p className="text-sm text-muted-foreground">
                Imported from {form.sourceName || "source site"}
                {form.sourceUrl ? (
                  <a
                    className="ml-2 inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    href={form.sourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open source
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                ) : null}
              </p>
              {importWarning ? (
                <p className="rounded-xl border border-plate-terracotta/35 bg-plate-terracotta/10 px-3 py-2 text-sm text-plate-terracotta">
                  {importWarning}
                </p>
              ) : null}
              {missingFields.length > 0 ? (
                <p className="rounded-xl border border-plate-terracotta/35 bg-plate-terracotta/10 px-3 py-2 text-sm text-plate-terracotta">
                  Please add: {missingFields.join(", ")}.
                </p>
              ) : null}
              {saveError ? (
                <p className="rounded-xl border border-plate-terracotta/35 bg-plate-terracotta/10 px-3 py-2 text-sm text-plate-terracotta">
                  {saveError}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <section className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="import-title">Recipe title</Label>
                    <Input
                      id="import-title"
                      value={form.title}
                      disabled={isSaving}
                      onChange={(event) => updateField("title", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="import-description">Description</Label>
                    <Textarea
                      id="import-description"
                      value={form.description}
                      disabled={isSaving}
                      onChange={(event) => updateField("description", event.target.value)}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <NumberField
                      id="import-servings"
                      label="Servings"
                      value={form.servings}
                      disabled={isSaving}
                      onChange={(value) => updateField("servings", value)}
                    />
                    <NumberField
                      id="import-prep-time"
                      label="Prep min"
                      value={form.prepTimeMinutes}
                      disabled={isSaving}
                      onChange={(value) => updateField("prepTimeMinutes", value)}
                    />
                    <NumberField
                      id="import-cook-time"
                      label="Cook min"
                      value={form.cookTimeMinutes}
                      disabled={isSaving}
                      onChange={(value) => updateField("cookTimeMinutes", value)}
                    />
                    <NumberField
                      id="import-total-time"
                      label="Total min"
                      value={form.totalTimeMinutes}
                      disabled={isSaving}
                      onChange={(value) => updateField("totalTimeMinutes", value)}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xl font-semibold text-plate-charcoal">Ingredients</h4>
                    <p className="mt-1 text-sm text-muted-foreground">Edit each ingredient line.</p>
                  </div>
                  <Button className="gap-2" variant="secondary" type="button" disabled={isSaving} onClick={addIngredient}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add ingredient
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {form.ingredients.map((ingredient, index) => (
                    <div key={index} className="grid gap-2 rounded-xl border bg-plate-paper/70 p-3 sm:grid-cols-[minmax(0,1fr)_40px]">
                      <Input
                        aria-label={`Ingredient ${index + 1}`}
                        value={ingredient}
                        disabled={isSaving}
                        placeholder="1 tablespoon olive oil"
                        onChange={(event) => updateIngredient(index, event.target.value)}
                      />
                      <Button
                        aria-label={`Remove ingredient ${index + 1}`}
                        className="h-10 w-10 px-0"
                        variant="ghost"
                        type="button"
                        disabled={isSaving}
                        onClick={() => removeIngredient(index)}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xl font-semibold text-plate-charcoal">Instructions</h4>
                    <p className="mt-1 text-sm text-muted-foreground">Edit each cooking step.</p>
                  </div>
                  <Button className="gap-2" variant="secondary" type="button" disabled={isSaving} onClick={addInstruction}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add step
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {form.instructions.map((instruction, index) => (
                    <div key={index} className="grid gap-2 rounded-xl border bg-plate-paper/70 p-3 sm:grid-cols-[40px_minmax(0,1fr)_40px] sm:items-start">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
                        {index + 1}
                      </div>
                      <Textarea
                        aria-label={`Instruction step ${index + 1}`}
                        className="min-h-20"
                        value={instruction}
                        disabled={isSaving}
                        placeholder="Describe this step"
                        onChange={(event) => updateInstruction(index, event.target.value)}
                      />
                      <Button
                        aria-label={`Remove step ${index + 1}`}
                        className="h-10 w-10 px-0"
                        variant="ghost"
                        type="button"
                        disabled={isSaving}
                        onClick={() => removeInstruction(index)}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-6 lg:sticky lg:top-20">
                <h4 className="text-lg font-semibold text-plate-charcoal">Import details</h4>
                <div className="mt-4 space-y-4">
                  <TextField
                    id="import-category"
                    label="Category"
                    value={form.category}
                    disabled={isSaving}
                    onChange={(value) => updateField("category", value)}
                  />
                  <TextField
                    id="import-tags"
                    label="Tags"
                    value={form.tags}
                    disabled={isSaving}
                    helper="Comma separated"
                    onChange={(value) => updateField("tags", value)}
                  />
                  <TextField
                    id="import-cuisine"
                    label="Cuisine"
                    value={form.cuisine}
                    disabled={isSaving}
                    onChange={(value) => updateField("cuisine", value)}
                  />
                  <TextField
                    id="import-author"
                    label="Author"
                    value={form.author}
                    disabled={isSaving}
                    onChange={(value) => updateField("author", value)}
                  />
                  <TextField
                    id="import-source-name"
                    label="Source site"
                    value={form.sourceName}
                    disabled={isSaving}
                    onChange={(value) => updateField("sourceName", value)}
                  />
                  <TextField
                    id="import-image-url"
                    label="Image URL"
                    value={form.imageUrl}
                    disabled={isSaving}
                    onChange={(value) => updateField("imageUrl", value)}
                  />
                </div>

                <div className="mt-6 border-t pt-4">
                  <Button className="h-11 w-full gap-2" disabled={saveDisabled} onClick={() => void handleSave()}>
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
                </div>
              </section>
            </aside>
          </div>
        </section>
      ) : null}

      {!form && !isImporting ? (
        <div className="rounded-2xl border border-dashed bg-plate-paper p-6 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 text-plate-terracotta" aria-hidden="true" />
            Import supports recipe pages with Spoonacular coverage or schema.org Recipe JSON-LD.
          </p>
        </div>
      ) : null}

      {saveSuccessMessage ? (
        <div className="fixed bottom-24 right-4 z-[70] w-[min(24rem,calc(100vw-2rem))] rounded-2xl border bg-white p-4 shadow-soft lg:bottom-6">
          <p className="font-semibold text-plate-charcoal">Recipe saved</p>
          <p className="mt-1 text-sm text-muted-foreground">{saveSuccessMessage}</p>
        </div>
      ) : null}
    </div>
  );
}

type NumberFieldProps = {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

function NumberField({ id, label, value, disabled, onChange }: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min="0"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  helper?: string;
  onChange: (value: string) => void;
};

function TextField({ id, label, value, disabled, helper, onChange }: TextFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function draftToForm(draft: ImportedRecipeDraft): ImportedRecipeDraftForm {
  return {
    title: draft.title,
    description: draft.description ?? "",
    ingredients: draft.ingredients.length > 0 ? draft.ingredients : [""],
    instructions: draft.instructions.length > 0 ? draft.instructions : [""],
    prepTimeMinutes: draft.prepTimeMinutes ? String(draft.prepTimeMinutes) : "",
    cookTimeMinutes: draft.cookTimeMinutes ? String(draft.cookTimeMinutes) : "",
    totalTimeMinutes: draft.totalTimeMinutes ? String(draft.totalTimeMinutes) : "",
    servings: draft.servings ? String(draft.servings) : "",
    imageUrl: draft.imageUrl ?? "",
    sourceUrl: draft.sourceUrl,
    sourceName: draft.sourceName ?? "",
    author: draft.author ?? "",
    cuisine: draft.cuisine ?? "",
    category: draft.category ?? "",
    tags: draft.tags.join(", "),
    importMethod: draft.importMethod,
  };
}

function formToDraft(form: ImportedRecipeDraftForm): ImportedRecipeDraft {
  return {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    ingredients: form.ingredients.map((ingredient) => ingredient.trim()).filter(Boolean),
    instructions: form.instructions.map((instruction) => instruction.trim()).filter(Boolean),
    prepTimeMinutes: parsePositiveInt(form.prepTimeMinutes),
    cookTimeMinutes: parsePositiveInt(form.cookTimeMinutes),
    totalTimeMinutes: parsePositiveInt(form.totalTimeMinutes),
    servings: parsePositiveInt(form.servings),
    imageUrl: form.imageUrl.trim() || undefined,
    sourceUrl: form.sourceUrl,
    sourceName: form.sourceName.trim() || undefined,
    author: form.author.trim() || undefined,
    cuisine: form.cuisine.trim() || undefined,
    category: form.category.trim() || undefined,
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    importMethod: form.importMethod,
  };
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
