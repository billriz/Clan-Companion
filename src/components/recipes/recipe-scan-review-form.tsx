"use client";

import { ArrowDown, ArrowUp, AlertTriangle, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RecipeScanSavePayload } from "@/lib/validations/recipe-scan";

type RecipeScanReviewFormProps = {
  values: RecipeScanSavePayload;
  isSaving: boolean;
  saveError: string | null;
  onChange: (next: RecipeScanSavePayload) => void;
  onSave: () => void;
  onCancel: () => void;
  onRescan: () => void;
};

export function RecipeScanReviewForm({
  values,
  isSaving,
  saveError,
  onChange,
  onSave,
  onCancel,
  onRescan,
}: RecipeScanReviewFormProps) {
  const confidenceMessage = getConfidenceMessage(values.confidenceScore);

  function updateField<K extends keyof RecipeScanSavePayload>(
    field: K,
    nextValue: RecipeScanSavePayload[K],
  ) {
    onChange({ ...values, [field]: nextValue });
  }

  function updateIngredient(
    index: number,
    field: keyof RecipeScanSavePayload["ingredients"][number],
    nextValue: string | boolean | null,
  ) {
    const nextIngredients = values.ingredients.map((ingredient, ingredientIndex) => {
      if (ingredientIndex !== index) {
        return ingredient;
      }

      return {
        ...ingredient,
        [field]: nextValue,
      };
    });

    updateField("ingredients", nextIngredients);
  }

  function addIngredient() {
    updateField("ingredients", [
      ...values.ingredients,
      {
        originalText: "",
        quantity: null,
        unit: null,
        name: null,
        preparation: null,
        optional: false,
        confidence: 0,
      },
    ]);
  }

  function removeIngredient(index: number) {
    updateField(
      "ingredients",
      values.ingredients.length <= 1
        ? [
            {
              originalText: "",
              quantity: null,
              unit: null,
              name: null,
              preparation: null,
              optional: false,
              confidence: 0,
            },
          ]
        : values.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index),
    );
  }

  function moveIngredient(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= values.ingredients.length) {
      return;
    }

    const nextIngredients = [...values.ingredients];
    const [movedIngredient] = nextIngredients.splice(index, 1);
    nextIngredients.splice(nextIndex, 0, movedIngredient);
    updateField("ingredients", nextIngredients);
  }

  function updateInstruction(index: number, field: "text" | "stepNumber", nextValue: string) {
    const nextInstructions = values.instructions.map((instruction, instructionIndex) => {
      if (instructionIndex !== index) {
        return instruction;
      }

      if (field === "stepNumber") {
        const parsedStepNumber = Number.parseInt(nextValue, 10);

        return {
          ...instruction,
          stepNumber: Number.isFinite(parsedStepNumber) && parsedStepNumber > 0 ? parsedStepNumber : 1,
        };
      }

      return {
        ...instruction,
        text: nextValue,
      };
    });

    updateField("instructions", nextInstructions);
  }

  function addInstruction() {
    updateField("instructions", [
      ...values.instructions,
      {
        stepNumber: values.instructions.length + 1,
        text: "",
        confidence: 0,
      },
    ]);
  }

  function removeInstruction(index: number) {
    const remainingInstructions =
      values.instructions.length <= 1
        ? [
            {
              stepNumber: 1,
              text: "",
              confidence: 0,
            },
          ]
        : values.instructions.filter((_, instructionIndex) => instructionIndex !== index);

    updateField(
      "instructions",
      remainingInstructions.map((instruction, instructionIndex) => ({
        ...instruction,
        stepNumber: instructionIndex + 1,
      })),
    );
  }

  function moveInstruction(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= values.instructions.length) {
      return;
    }

    const nextInstructions = [...values.instructions];
    const [movedInstruction] = nextInstructions.splice(index, 1);
    nextInstructions.splice(nextIndex, 0, movedInstruction);

    updateField(
      "instructions",
      nextInstructions.map((instruction, instructionIndex) => ({
        ...instruction,
        stepNumber: instructionIndex + 1,
      })),
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gravy-gold/25 bg-gravy-gold/10 p-4 text-sm text-gravy-brown sm:p-5">
        <p className="font-semibold">{confidenceMessage}</p>
      </section>

      {values.warnings.length > 0 ? (
        <section className="rounded-2xl border border-gravy-brown/30 bg-gravy-brown/10 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-gravy-brown" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-gravy-brown">Warnings</h2>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-gravy-charcoal">
            {values.warnings.map((warning) => (
              <li key={warning} className="rounded-lg bg-card/70 px-3 py-2">
                {warning}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {saveError ? (
        <section className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {saveError}
        </section>
      ) : null}

      <section className="rounded-2xl border bg-card p-5 shadow-subtle sm:p-6">
        <h2 className="text-xl font-semibold text-gravy-charcoal">Review Recipe</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="scan-title">Recipe title</Label>
            <Input
              id="scan-title"
              value={values.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="scan-description">Description</Label>
            <Textarea
              id="scan-description"
              value={values.description ?? ""}
              onChange={(event) => updateField("description", event.target.value || null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scan-servings">Servings</Label>
            <Input
              id="scan-servings"
              value={values.servings === null ? "" : String(values.servings)}
              onChange={(event) => updateField("servings", event.target.value || null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scan-prep">Prep time (minutes)</Label>
            <Input
              id="scan-prep"
              type="number"
              min={0}
              value={values.prepTimeMinutes ?? ""}
              onChange={(event) =>
                updateField(
                  "prepTimeMinutes",
                  event.target.value ? Number.parseInt(event.target.value, 10) : null,
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scan-cook">Cook time (minutes)</Label>
            <Input
              id="scan-cook"
              type="number"
              min={0}
              value={values.cookTimeMinutes ?? ""}
              onChange={(event) =>
                updateField(
                  "cookTimeMinutes",
                  event.target.value ? Number.parseInt(event.target.value, 10) : null,
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scan-total">Total time (minutes)</Label>
            <Input
              id="scan-total"
              type="number"
              min={0}
              value={values.totalTimeMinutes ?? ""}
              onChange={(event) =>
                updateField(
                  "totalTimeMinutes",
                  event.target.value ? Number.parseInt(event.target.value, 10) : null,
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scan-cuisine">Cuisine</Label>
            <Input
              id="scan-cuisine"
              value={values.cuisine ?? ""}
              onChange={(event) => updateField("cuisine", event.target.value || null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scan-meal-type">Meal type</Label>
            <Input
              id="scan-meal-type"
              value={values.mealType ?? ""}
              onChange={(event) => updateField("mealType", event.target.value || null)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="scan-tags">Tags (comma separated)</Label>
            <Input
              id="scan-tags"
              value={values.tags.join(", ")}
              onChange={(event) =>
                updateField(
                  "tags",
                  event.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                )
              }
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="scan-notes">Notes</Label>
            <Textarea
              id="scan-notes"
              value={values.notes.join("\n")}
              onChange={(event) =>
                updateField(
                  "notes",
                  event.target.value
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean),
                )
              }
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-subtle sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-gravy-charcoal">Ingredients</h2>
          <Button className="gap-2" type="button" variant="secondary" onClick={addIngredient}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add ingredient
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          {values.ingredients.map((ingredient, index) => {
            const isLowConfidence = ingredient.confidence < 0.7;

            return (
              <div
                key={`ingredient-${index}`}
                className={`rounded-xl border p-4 ${
                  isLowConfidence ? "border-gravy-brown/45 bg-gravy-brown/5" : "bg-gravy-paper"
                }`}
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant={isLowConfidence ? "terracotta" : "neutral"}>
                    Confidence {Math.round(ingredient.confidence * 100)}%
                  </Badge>
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      aria-label={`Move ingredient ${index + 1} up`}
                      className="h-9 w-9 px-0"
                      type="button"
                      variant="secondary"
                      onClick={() => moveIngredient(index, -1)}
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      aria-label={`Move ingredient ${index + 1} down`}
                      className="h-9 w-9 px-0"
                      type="button"
                      variant="secondary"
                      onClick={() => moveIngredient(index, 1)}
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      aria-label={`Remove ingredient ${index + 1}`}
                      className="h-9 w-9 px-0"
                      type="button"
                      variant="destructive"
                      onClick={() => removeIngredient(index)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Input
                    aria-label={`Ingredient ${index + 1} original text`}
                    placeholder="Original line"
                    value={ingredient.originalText}
                    onChange={(event) => updateIngredient(index, "originalText", event.target.value)}
                  />
                  <Input
                    aria-label={`Ingredient ${index + 1} quantity`}
                    placeholder="Quantity"
                    value={ingredient.quantity ?? ""}
                    onChange={(event) => updateIngredient(index, "quantity", event.target.value || null)}
                  />
                  <Input
                    aria-label={`Ingredient ${index + 1} unit`}
                    placeholder="Unit"
                    value={ingredient.unit ?? ""}
                    onChange={(event) => updateIngredient(index, "unit", event.target.value || null)}
                  />
                  <Input
                    aria-label={`Ingredient ${index + 1} name`}
                    placeholder="Ingredient"
                    value={ingredient.name ?? ""}
                    onChange={(event) => updateIngredient(index, "name", event.target.value || null)}
                  />
                  <Input
                    aria-label={`Ingredient ${index + 1} preparation`}
                    placeholder="Preparation"
                    value={ingredient.preparation ?? ""}
                    onChange={(event) => updateIngredient(index, "preparation", event.target.value || null)}
                  />
                  <label className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                    <input
                      checked={ingredient.optional}
                      className="h-4 w-4"
                      type="checkbox"
                      onChange={(event) => updateIngredient(index, "optional", event.target.checked)}
                    />
                    Optional
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-subtle sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-gravy-charcoal">Instructions</h2>
          <Button className="gap-2" type="button" variant="secondary" onClick={addInstruction}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add step
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          {values.instructions.map((instruction, index) => {
            const isLowConfidence = instruction.confidence < 0.7;

            return (
              <div
                key={`instruction-${index}`}
                className={`rounded-xl border p-4 ${
                  isLowConfidence ? "border-gravy-brown/45 bg-gravy-brown/5" : "bg-gravy-paper"
                }`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <Input
                    aria-label={`Step ${index + 1} number`}
                    className="max-w-24"
                    min={1}
                    type="number"
                    value={instruction.stepNumber}
                    onChange={(event) => updateInstruction(index, "stepNumber", event.target.value)}
                  />
                  <Badge variant={isLowConfidence ? "terracotta" : "neutral"}>
                    Confidence {Math.round(instruction.confidence * 100)}%
                  </Badge>
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      aria-label={`Move step ${index + 1} up`}
                      className="h-9 w-9 px-0"
                      type="button"
                      variant="secondary"
                      onClick={() => moveInstruction(index, -1)}
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      aria-label={`Move step ${index + 1} down`}
                      className="h-9 w-9 px-0"
                      type="button"
                      variant="secondary"
                      onClick={() => moveInstruction(index, 1)}
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      aria-label={`Remove step ${index + 1}`}
                      className="h-9 w-9 px-0"
                      type="button"
                      variant="destructive"
                      onClick={() => removeInstruction(index)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                <Textarea
                  aria-label={`Instruction step ${index + 1} text`}
                  placeholder="Describe this step"
                  value={instruction.text}
                  onChange={(event) => updateInstruction(index, "text", event.target.value)}
                />
              </div>
            );
          })}
        </div>
      </section>

      <footer className="flex flex-col gap-2 rounded-2xl border bg-card p-4 shadow-subtle sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="secondary" onClick={onRescan}>
          Re-scan Image
        </Button>
        <Button disabled={isSaving} type="button" onClick={onSave}>
          {isSaving ? "Saving Recipe..." : "Save Recipe"}
        </Button>
      </footer>
    </div>
  );
}

function getConfidenceMessage(confidenceScore: number) {
  if (confidenceScore >= 0.85) {
    return "Looks good - please review before saving.";
  }

  if (confidenceScore >= 0.6) {
    return "Some parts may need review.";
  }

  return "We had trouble reading this image. Please review carefully or try another photo.";
}
