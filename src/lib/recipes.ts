import type { Json } from "@/types/supabase";
import type { Difficulty, Ingredient, Recipe, RecipeFormValues } from "@/types/recipes";

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const satisfies readonly Difficulty[];

export const RECIPE_IMAGE_BUCKET = "recipe-images";

export function getTotalTime(recipe: Pick<Recipe, "prep_time" | "cook_time">) {
  return (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
}

export function formatMinutes(minutes: number | null | undefined) {
  if (!minutes || minutes <= 0) {
    return "Any time";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}

export function normalizeDifficulty(value: string | null | undefined): Difficulty {
  return DIFFICULTIES.includes(value as Difficulty) ? (value as Difficulty) : "Easy";
}

export function parseIngredients(value: Json): Ingredient[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, Json | undefined>;
      const quantity = typeof record.quantity === "string" ? record.quantity : "";
      const unit = typeof record.unit === "string" ? record.unit : "";
      const name = typeof record.name === "string" ? record.name : "";

      if (!quantity && !unit && !name) {
        return null;
      }

      return { quantity, unit, name };
    })
    .filter((ingredient): ingredient is Ingredient => ingredient !== null);
}

export function parseInstructions(value: Json): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((step): step is string => typeof step === "string" && step.trim().length > 0);
}

export function parseTags(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((tag) => tag.trim()).filter(Boolean);
  }

  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function emptyRecipeFormValues(): RecipeFormValues {
  return {
    title: "",
    description: "",
    imageUrl: null,
    prepTime: "",
    cookTime: "",
    servings: "",
    difficulty: "Easy",
    category: "",
    tags: "",
    ingredients: [{ quantity: "", unit: "", name: "" }],
    instructions: [""],
  };
}

export function recipeToFormValues(recipe: Recipe): RecipeFormValues {
  const ingredients = parseIngredients(recipe.ingredients);
  const instructions = parseInstructions(recipe.instructions);

  return {
    title: recipe.title,
    description: recipe.description ?? "",
    imageUrl: recipe.image_url,
    prepTime: recipe.prep_time ? String(recipe.prep_time) : "",
    cookTime: recipe.cook_time ? String(recipe.cook_time) : "",
    servings: recipe.servings ? String(recipe.servings) : "",
    difficulty: normalizeDifficulty(recipe.difficulty),
    category: recipe.category ?? "",
    tags: recipe.tags?.join(", ") ?? "",
    ingredients: ingredients.length > 0 ? ingredients : [{ quantity: "", unit: "", name: "" }],
    instructions: instructions.length > 0 ? instructions : [""],
  };
}

export function toOptionalInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
