"use client";

import Image from "next/image";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Camera, ImagePlus, Loader2, Plus, Save, Trash2, X } from "lucide-react";

import { RecipeImagePlaceholder } from "@/components/recipes/recipe-image-placeholder";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DIFFICULTIES,
  RECIPE_IMAGE_BUCKET,
  emptyRecipeFormValues,
  parseTags,
  recipeToFormValues,
  toOptionalInteger,
} from "@/lib/recipes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Database, Json } from "@/types/supabase";
import type { Ingredient, Recipe, RecipeFormValues } from "@/types/recipes";

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

type RecipeFormProps = {
  mode: "create" | "edit";
  recipe?: Recipe;
};

export function RecipeForm({ mode, recipe }: RecipeFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<RecipeFormValues>(() =>
    recipe ? recipeToFormValues(recipe) : emptyRecipeFormValues(),
  );
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!previewUrl) {
      return;
    }

    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const imagePreview = previewUrl || values.imageUrl;
  const title = mode === "create" ? "Create Recipe" : "Edit Recipe";
  const subtitle =
    mode === "create"
      ? "Add the details your family will scan when picking what to cook."
      : "Tune the recipe details, ingredients, and image.";

  function updateField<K extends keyof RecipeFormValues>(field: K, value: RecipeFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function updateIngredient(index: number, field: keyof Ingredient, value: string) {
    setValues((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient, ingredientIndex) =>
        ingredientIndex === index ? { ...ingredient, [field]: value } : ingredient,
      ),
    }));
  }

  function addIngredient() {
    setValues((current) => ({
      ...current,
      ingredients: [...current.ingredients, { quantity: "", unit: "", name: "" }],
    }));
  }

  function removeIngredient(index: number) {
    setValues((current) => ({
      ...current,
      ingredients:
        current.ingredients.length === 1
          ? [{ quantity: "", unit: "", name: "" }]
          : current.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index),
    }));
  }

  function updateInstruction(index: number, value: string) {
    setValues((current) => ({
      ...current,
      instructions: current.instructions.map((instruction, instructionIndex) =>
        instructionIndex === index ? value : instruction,
      ),
    }));
  }

  function addInstruction() {
    setValues((current) => ({ ...current, instructions: [...current.instructions, ""] }));
  }

  function removeInstruction(index: number) {
    setValues((current) => ({
      ...current,
      instructions:
        current.instructions.length === 1
          ? [""]
          : current.instructions.filter((_, instructionIndex) => instructionIndex !== index),
    }));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setError(null);

    if (!file) {
      setSelectedImage(null);
      setPreviewUrl(null);
      return;
    }

    if (!allowedImageTypes.includes(file.type)) {
      setSelectedImage(null);
      setPreviewUrl(null);
      setError("Use a JPG, PNG, or WebP image for recipes.");
      event.target.value = "";
      return;
    }

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function clearImage() {
    setSelectedImage(null);
    setPreviewUrl(null);
    updateField("imageUrl", null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setWarning(null);

    const cleanTitle = values.title.trim();

    if (!cleanTitle) {
      setError("Recipe title is required.");
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Please sign in again before saving this recipe.");
        return;
      }

      let imageUrl = values.imageUrl;

      if (selectedImage) {
        const uploadResult = await uploadRecipeImage(supabase, user.id, selectedImage);

        if (uploadResult.publicUrl) {
          imageUrl = uploadResult.publicUrl;
        } else {
          setWarning("The recipe will save without the new image because the upload failed.");
        }
      }

      const cleanedIngredients = values.ingredients
        .map((ingredient) => ({
          quantity: ingredient.quantity.trim(),
          unit: ingredient.unit.trim(),
          name: ingredient.name.trim(),
        }))
        .filter((ingredient) => ingredient.quantity || ingredient.unit || ingredient.name);

      const cleanedInstructions = values.instructions
        .map((instruction) => instruction.trim())
        .filter(Boolean);

      const payload = {
        title: cleanTitle,
        description: values.description.trim() || null,
        image_url: imageUrl,
        prep_time: toOptionalInteger(values.prepTime),
        cook_time: toOptionalInteger(values.cookTime),
        servings: toOptionalInteger(values.servings),
        difficulty: values.difficulty,
        category: values.category.trim() || null,
        tags: parseTags(values.tags),
        ingredients: cleanedIngredients as unknown as Json,
        instructions: cleanedInstructions as unknown as Json,
      };

      if (mode === "edit" && recipe) {
        const { error: updateError } = await supabase
          .from("recipes")
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", recipe.id);

        if (updateError) {
          setError(updateError.message);
          return;
        }

        router.push(`/recipes/${recipe.id}`);
        router.refresh();
        return;
      }

      const { data, error: insertError } = await supabase
        .from("recipes")
        .insert({
          ...payload,
          user_id: user.id,
        })
        .select("id")
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      router.push(`/recipes/${data.id}`);
      router.refresh();
    } catch {
      setError("Recipe could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="terracotta">{mode === "create" ? "New" : "Editing"}</Badge>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-plate-charcoal">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
          </div>
          <Link className={cn(buttonVariants({ variant: "secondary" }))} href="/recipes">
            Cancel
          </Link>
        </div>
      </div>

      {error ? (
        <div
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {warning ? (
        <div
          className="rounded-2xl border border-plate-terracotta/30 bg-plate-terracotta/10 px-4 py-3 text-sm text-plate-terracotta"
          role="status"
        >
          {warning}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-6">
            <div className="grid gap-5">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  required
                  value={values.title}
                  placeholder="Sunday chicken and rice"
                  disabled={isSaving}
                  onChange={(event) => updateField("title", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={values.description}
                  placeholder="A short note about why this recipe belongs in the family rotation."
                  disabled={isSaving}
                  onChange={(event) => updateField("description", event.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <NumberField
                  id="prepTime"
                  label="Prep time"
                  value={values.prepTime}
                  placeholder="15"
                  disabled={isSaving}
                  onChange={(value) => updateField("prepTime", value)}
                />
                <NumberField
                  id="cookTime"
                  label="Cook time"
                  value={values.cookTime}
                  placeholder="30"
                  disabled={isSaving}
                  onChange={(value) => updateField("cookTime", value)}
                />
                <NumberField
                  id="servings"
                  label="Servings"
                  value={values.servings}
                  placeholder="4"
                  disabled={isSaving}
                  onChange={(value) => updateField("servings", value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <select
                    id="difficulty"
                    className="flex h-11 w-full rounded-md border border-input bg-plate-paper px-3 py-2 text-sm text-plate-charcoal shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                    value={values.difficulty}
                    disabled={isSaving}
                    onChange={(event) =>
                      updateField("difficulty", event.target.value as RecipeFormValues["difficulty"])
                    }
                  >
                    {DIFFICULTIES.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>
                        {difficulty}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={values.category}
                    placeholder="Dinner"
                    disabled={isSaving}
                    onChange={(event) => updateField("category", event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={values.tags}
                    placeholder="quick, freezer"
                    disabled={isSaving}
                    onChange={(event) => updateField("tags", event.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-plate-charcoal">Ingredients</h2>
                <p className="mt-1 text-sm text-muted-foreground">Quantity, unit, and ingredient name.</p>
              </div>
              <Button className="gap-2" type="button" variant="secondary" disabled={isSaving} onClick={addIngredient}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {values.ingredients.map((ingredient, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl border bg-plate-paper/70 p-3 sm:grid-cols-[90px_110px_minmax(0,1fr)_40px] sm:items-center"
                >
                  <Input
                    aria-label={`Ingredient ${index + 1} quantity`}
                    value={ingredient.quantity}
                    placeholder="2"
                    disabled={isSaving}
                    onChange={(event) => updateIngredient(index, "quantity", event.target.value)}
                  />
                  <Input
                    aria-label={`Ingredient ${index + 1} unit`}
                    value={ingredient.unit}
                    placeholder="cups"
                    disabled={isSaving}
                    onChange={(event) => updateIngredient(index, "unit", event.target.value)}
                  />
                  <Input
                    aria-label={`Ingredient ${index + 1} name`}
                    value={ingredient.name}
                    placeholder="rice"
                    disabled={isSaving}
                    onChange={(event) => updateIngredient(index, "name", event.target.value)}
                  />
                  <Button
                    aria-label={`Remove ingredient ${index + 1}`}
                    className="h-10 w-10 px-0"
                    type="button"
                    variant="ghost"
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
                <h2 className="text-xl font-semibold text-plate-charcoal">Instructions</h2>
                <p className="mt-1 text-sm text-muted-foreground">Add the ordered cooking steps.</p>
              </div>
              <Button className="gap-2" type="button" variant="secondary" disabled={isSaving} onClick={addInstruction}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Step
              </Button>
            </div>

            <div className="mt-5 space-y-3">
              {values.instructions.map((instruction, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl border bg-plate-paper/70 p-3 sm:grid-cols-[40px_minmax(0,1fr)_40px]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <Textarea
                    aria-label={`Instruction step ${index + 1}`}
                    className="min-h-20"
                    value={instruction}
                    placeholder="Mix ingredients together."
                    disabled={isSaving}
                    onChange={(event) => updateInstruction(index, event.target.value)}
                  />
                  <Button
                    aria-label={`Remove step ${index + 1}`}
                    className="h-10 w-10 px-0"
                    type="button"
                    variant="ghost"
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
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-plate-charcoal">Recipe image</h2>
            </div>

            <div className="relative mt-4 aspect-video overflow-hidden rounded-2xl border bg-secondary">
              {imagePreview ? (
                <Image
                  fill
                  unoptimized
                  alt="Recipe preview"
                  className="object-cover"
                  sizes="(min-width: 1024px) 340px, 100vw"
                  src={imagePreview}
                />
              ) : (
                <RecipeImagePlaceholder iconClassName="h-12 w-12" />
              )}
            </div>

            <div className="mt-4 space-y-3">
              <Label
                className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-plate-paper px-4 py-2 text-sm font-medium text-plate-charcoal shadow-sm transition hover:bg-secondary"
                htmlFor="recipeImage"
              >
                <ImagePlus className="h-4 w-4 text-primary" aria-hidden="true" />
                Upload image
              </Label>
              <Input
                id="recipeImage"
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isSaving}
                onChange={handleImageChange}
              />
              {imagePreview ? (
                <Button className="w-full gap-2" type="button" variant="secondary" onClick={clearImage}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Remove image
                </Button>
              ) : null}
              <p className="text-xs leading-5 text-muted-foreground">JPG, PNG, and WebP are supported.</p>
            </div>

            <div className="mt-6 border-t pt-5">
              <Button className="w-full gap-2" type="submit" disabled={isSaving}>
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
    </form>
  );
}

type NumberFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

function NumberField({ id, label, value, placeholder, disabled, onChange }: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        min="0"
        inputMode="numeric"
        type="number"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

async function uploadRecipeImage(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File,
): Promise<{ publicUrl: string | null }> {
  const extension = getImageExtension(file);
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(RECIPE_IMAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return { publicUrl: null };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(RECIPE_IMAGE_BUCKET).getPublicUrl(path);

  return { publicUrl };
}

function getImageExtension(file: File) {
  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}
