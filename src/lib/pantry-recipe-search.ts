import { normalizeIngredientName } from "@/lib/ingredients";
import { buildShoppingListPayloadFromIngredients } from "@/lib/pantry";
import { formatQuantity } from "@/lib/shopping-list";
import type { Ingredient } from "@/types/recipes";
import type {
  NormalizedPantryRecipeResult,
  NormalizedPantryRecipeResultIngredient,
  SpoonacularFindByIngredientsIngredient,
  SpoonacularFindByIngredientsResult,
  SpoonacularPantryRecipeSearchParams,
} from "@/types/spoonacular";

export const DEFAULT_PANTRY_RECIPE_RESULT_COUNT = 12;
export const DEFAULT_PANTRY_RECIPE_RANKING: 1 | 2 = 2;
export const DEFAULT_PANTRY_RECIPE_IGNORE_PANTRY = false;
export const MAX_PANTRY_RECIPE_RESULT_COUNT = 24;
export const MAX_PANTRY_SEARCH_INGREDIENTS = 36;

const NON_FOOD_CATEGORY_KEYWORDS = [
  "household",
  "clean",
  "cleaning",
  "laundry",
  "paper",
  "pet",
  "toiletry",
  "toiletries",
  "hygiene",
  "dish soap",
  "supplies",
];

const DEFAULT_DESELECT_INGREDIENTS = new Set<string>([
  "water",
  "salt",
  "pepper",
  "olive oil",
  "vegetable oil",
  "cooking spray",
]);

export class PantryRecipeSearchInputError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PantryRecipeSearchInputError";
    this.status = status;
  }
}

export function isNonFoodPantryCategory(category: string | null | undefined) {
  const cleanedCategory = category?.trim().toLowerCase() ?? "";

  if (!cleanedCategory) {
    return false;
  }

  return NON_FOOD_CATEGORY_KEYWORDS.some((keyword) => cleanedCategory.includes(keyword));
}

export function shouldDefaultSelectPantryItem({
  name,
  category,
}: {
  name: string;
  category?: string | null;
}) {
  const normalizedName = normalizeIngredientName(name);

  if (!normalizedName) {
    return false;
  }

  if (isNonFoodPantryCategory(category)) {
    return false;
  }

  return !DEFAULT_DESELECT_INGREDIENTS.has(normalizedName);
}

export function normalizeIngredientNames(ingredientNames: string[]) {
  const unique = new Set<string>();

  ingredientNames.forEach((ingredientName) => {
    const normalizedName = normalizeIngredientName(ingredientName);

    if (!normalizedName) {
      return;
    }

    unique.add(normalizedName);
  });

  return Array.from(unique).sort((firstName, secondName) => firstName.localeCompare(secondName));
}

export function filterIngredientItemsToFood(
  ingredientItems: Array<{
    name: string;
    category?: string | null;
  }>,
) {
  const names = ingredientItems
    .filter((item) => !isNonFoodPantryCategory(item.category))
    .map((item) => item.name);

  return normalizeIngredientNames(names);
}

export function parsePantryRecipeSearchParams(
  params: SpoonacularPantryRecipeSearchParams,
): {
  ingredientNames: string[];
  number: number;
  ranking: 1 | 2;
  ignorePantry: boolean;
} {
  if (!Array.isArray(params.ingredientNames)) {
    throw new PantryRecipeSearchInputError("ingredientNames must be an array.");
  }

  const normalizedFromNames = normalizeIngredientNames(params.ingredientNames);

  const normalizedIngredientNames =
    Array.isArray(params.ingredientItems) && params.ingredientItems.length > 0
    ? filterIngredientItemsToFood(params.ingredientItems)
    : normalizedFromNames;

  if (normalizedIngredientNames.length === 0) {
    throw new PantryRecipeSearchInputError("Select at least one pantry item to search for recipes.");
  }

  const limitedIngredientNames = normalizedIngredientNames.slice(0, MAX_PANTRY_SEARCH_INGREDIENTS);
  const number = normalizeResultCount(params.number);
  const ranking = normalizeRanking(params.ranking);
  const ignorePantry =
    typeof params.ignorePantry === "boolean"
      ? params.ignorePantry
      : DEFAULT_PANTRY_RECIPE_IGNORE_PANTRY;

  return {
    ingredientNames: limitedIngredientNames,
    number,
    ranking,
    ignorePantry,
  };
}

export function normalizePantryRecipeSearchResults(
  payload: unknown,
): NormalizedPantryRecipeResult[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((result) => normalizePantryRecipeSearchResult(result as SpoonacularFindByIngredientsResult))
    .filter((result): result is NormalizedPantryRecipeResult => Boolean(result));
}

export function normalizePantryRecipeSearchResult(
  recipe: SpoonacularFindByIngredientsResult,
): NormalizedPantryRecipeResult | null {
  const id = toPositiveInteger(recipe.id);
  const title = sanitizeText(recipe.title);

  if (!id || !title) {
    return null;
  }

  const usedIngredients = normalizeIngredientList(recipe.usedIngredients);
  const missedIngredients = normalizeIngredientList(recipe.missedIngredients);
  const unusedIngredients = normalizeIngredientList(recipe.unusedIngredients);

  return {
    id,
    title,
    image: sanitizeUrl(recipe.image),
    usedIngredientCount: toNonNegativeInteger(recipe.usedIngredientCount) ?? usedIngredients.length,
    missedIngredientCount: toNonNegativeInteger(recipe.missedIngredientCount) ?? missedIngredients.length,
    usedIngredients,
    missedIngredients,
    unusedIngredients,
    source: "spoonacular",
  };
}

export function normalizeIngredientList(
  ingredients: unknown,
): NormalizedPantryRecipeResultIngredient[] {
  if (!Array.isArray(ingredients)) {
    return [];
  }

  return ingredients
    .map((ingredient) => normalizePantryRecipeResultIngredient(ingredient as SpoonacularFindByIngredientsIngredient))
    .filter((ingredient): ingredient is NormalizedPantryRecipeResultIngredient => Boolean(ingredient));
}

export function normalizePantryRecipeResultIngredient(
  ingredient: SpoonacularFindByIngredientsIngredient,
): NormalizedPantryRecipeResultIngredient | null {
  const name = sanitizeText(ingredient.name);

  if (!name) {
    return null;
  }

  const original = sanitizeText(ingredient.original) ?? undefined;
  const unit = sanitizeText(ingredient.unit) ?? undefined;

  return {
    id: toPositiveInteger(ingredient.id) ?? undefined,
    name,
    original,
    amount: toFiniteNumber(ingredient.amount) ?? undefined,
    unit,
    image: sanitizeUrl(ingredient.image) ?? undefined,
  };
}

export function mapMissedIngredientsToRecipeIngredients(
  missedIngredients: NormalizedPantryRecipeResultIngredient[],
): Ingredient[] {
  return missedIngredients
    .map((ingredient) => ({
      quantity:
        typeof ingredient.amount === "number" && Number.isFinite(ingredient.amount)
          ? formatQuantity(ingredient.amount)
          : "",
      unit: ingredient.unit?.trim() ?? "",
      name: ingredient.name,
    }))
    .filter((ingredient) => normalizeIngredientName(ingredient.name));
}

export function buildShoppingPayloadFromMissedIngredients({
  missedIngredients,
  userId,
  weekStartKey,
}: {
  missedIngredients: NormalizedPantryRecipeResultIngredient[];
  userId: string;
  weekStartKey: string;
}) {
  const recipeIngredients = mapMissedIngredientsToRecipeIngredients(missedIngredients);

  return buildShoppingListPayloadFromIngredients({
    ingredients: recipeIngredients,
    userId,
    weekStartKey,
  });
}

function normalizeResultCount(value: number | string | undefined) {
  if (value === undefined) {
    return DEFAULT_PANTRY_RECIPE_RESULT_COUNT;
  }

  const parsedValue = parsePositiveInteger(value);

  if (parsedValue === null) {
    throw new PantryRecipeSearchInputError("number must be a positive integer.");
  }

  return Math.min(MAX_PANTRY_RECIPE_RESULT_COUNT, Math.max(1, parsedValue));
}

function normalizeRanking(value: 1 | 2 | number | string | undefined) {
  if (value === undefined) {
    return DEFAULT_PANTRY_RECIPE_RANKING;
  }

  const parsedValue = parsePositiveInteger(value);

  if (parsedValue !== 1 && parsedValue !== 2) {
    throw new PantryRecipeSearchInputError("ranking must be 1 or 2.");
  }

  return parsedValue;
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

function toNonNegativeInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded >= 0 ? rounded : null;
}

function toPositiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}

function toFiniteNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(3));
}

function sanitizeText(value: unknown, maxLength = 240) {
  if (typeof value !== "string") {
    return null;
  }

  const withoutHtml = value.replace(/<[^>]*>/g, " ");
  const squashed = withoutHtml.replace(/\s+/g, " ").trim();

  if (!squashed) {
    return null;
  }

  if (squashed.length <= maxLength) {
    return squashed;
  }

  return `${squashed.slice(0, maxLength - 3).trimEnd()}...`;
}

function sanitizeUrl(value: unknown) {
  const cleaned = sanitizeText(value, 600);

  if (!cleaned) {
    return null;
  }

  try {
    const parsed = new URL(cleaned);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}
