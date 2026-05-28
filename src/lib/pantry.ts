import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isCompatibleUnit,
  normalizeIngredientName,
  normalizeMeasurementUnit,
  parseSimpleQuantity,
} from "@/lib/ingredients";
import { combineIngredients, normalizeCategory } from "@/lib/shopping-list";
import type { Ingredient } from "@/types/recipes";
import type {
  PantryComparisonResult,
  PantryIngredientMatch,
  PantryItem,
  PantryItemInsert,
  PantryItemUpdate,
} from "@/types/pantry";
import type { ShoppingListItemInsert } from "@/types/shopping-list";
import type { Database } from "@/types/supabase";

type AppSupabaseClient = SupabaseClient<Database>;

type PantryItemWriteInput = {
  name: string;
  household_id?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  category?: string | null;
  location?: string | null;
  notes?: string | null;
  is_staple?: boolean;
  low_stock_threshold?: number | string | null;
};

type PantryItemUpdateInput = Partial<PantryItemWriteInput>;

type FetchPantryItemsParams = {
  userId: string;
  search?: string;
  category?: string;
  location?: string;
  supabase?: AppSupabaseClient;
};

type CreatePantryItemParams = {
  userId: string;
  item: PantryItemWriteInput;
  supabase?: AppSupabaseClient;
};

type UpdatePantryItemParams = {
  id: string;
  userId: string;
  updates: PantryItemUpdateInput;
  supabase?: AppSupabaseClient;
};

type DeletePantryItemParams = {
  id: string;
  userId: string;
  supabase?: AppSupabaseClient;
};

export async function fetchPantryItems({
  userId,
  search,
  category,
  location,
  supabase,
}: FetchPantryItemsParams) {
  const client = await getSupabaseClient(supabase);

  let query = client
    .from("pantry_items")
    .select("*")
    .eq("user_id", userId)
    .order("location", { ascending: true })
    .order("name", { ascending: true });

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  if (location && location !== "all") {
    query = query.eq("location", location);
  }

  if (search?.trim()) {
    const normalizedSearch = normalizeIngredientName(search);
    const safeSearch = search
      .trim()
      .replace(/[%_',]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    query = query.or(
      `name.ilike.%${safeSearch}%,normalized_name.ilike.%${normalizedSearch || safeSearch}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PantryItem[];
}

export async function createPantryItem({ userId, item, supabase }: CreatePantryItemParams) {
  const client = await getSupabaseClient(supabase);
  const cleanName = item.name.trim();

  const payload: PantryItemInsert = {
    ...item,
    user_id: userId,
    name: cleanName,
    normalized_name: normalizeIngredientName(cleanName),
    unit: normalizeOptionalText(item.unit),
    category: normalizeOptionalText(item.category),
    location: normalizeOptionalText(item.location),
    notes: normalizeOptionalText(item.notes),
    quantity: toNullableNumber(item.quantity),
    low_stock_threshold: toNullableNumber(item.low_stock_threshold),
  };

  const { data, error } = await client.from("pantry_items").insert(payload).select("*").single();

  if (error) {
    throw new Error(error.message);
  }

  return data as PantryItem;
}

export async function updatePantryItem({
  id,
  userId,
  updates,
  supabase,
}: UpdatePantryItemParams) {
  const client = await getSupabaseClient(supabase);
  const nextUpdates: PantryItemUpdate = {};

  if (typeof updates.name === "string") {
    const cleanName = updates.name.trim();
    nextUpdates.name = cleanName;
    nextUpdates.normalized_name = normalizeIngredientName(cleanName);
  }

  if ("unit" in updates) {
    nextUpdates.unit = normalizeOptionalText(updates.unit);
  }

  if ("category" in updates) {
    nextUpdates.category = normalizeOptionalText(updates.category);
  }

  if ("location" in updates) {
    nextUpdates.location = normalizeOptionalText(updates.location);
  }

  if ("notes" in updates) {
    nextUpdates.notes = normalizeOptionalText(updates.notes);
  }

  if ("quantity" in updates) {
    nextUpdates.quantity = toNullableNumber(updates.quantity);
  }

  if ("low_stock_threshold" in updates) {
    nextUpdates.low_stock_threshold = toNullableNumber(updates.low_stock_threshold);
  }

  if ("is_staple" in updates) {
    nextUpdates.is_staple = Boolean(updates.is_staple);
  }

  if ("household_id" in updates) {
    nextUpdates.household_id = updates.household_id ?? null;
  }

  const { data, error } = await client
    .from("pantry_items")
    .update(nextUpdates)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as PantryItem;
}

export async function deletePantryItem({ id, userId, supabase }: DeletePantryItemParams) {
  const client = await getSupabaseClient(supabase);

  const { error } = await client.from("pantry_items").delete().eq("id", id).eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export function compareRecipeToPantry(
  recipeIngredients: Ingredient[],
  pantryItems: PantryItem[],
): PantryComparisonResult {
  const allMatches = recipeIngredients.map((ingredient) => matchIngredientToPantry(ingredient, pantryItems));

  const availableIngredients = allMatches.filter((match) => match.status === "have");
  const missingIngredients = allMatches.filter((match) => match.status === "missing");
  const partialIngredients = allMatches.filter((match) => match.status === "partial");
  const totalCount = allMatches.length;
  const availableCount = availableIngredients.length;
  const matchPercentage = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;

  return {
    ingredientMatches: allMatches,
    availableIngredients,
    missingIngredients,
    partialIngredients,
    matchPercentage,
    availableCount,
    totalCount,
  };
}

export function getMissingIngredients(recipeIngredients: Ingredient[], pantryItems: PantryItem[]) {
  return compareRecipeToPantry(recipeIngredients, pantryItems).missingIngredients;
}

export function getPantryMatchScore(recipeIngredients: Ingredient[], pantryItems: PantryItem[]) {
  const comparison = compareRecipeToPantry(recipeIngredients, pantryItems);

  if (comparison.totalCount === 0) {
    return 0;
  }

  const weightedMatches = comparison.availableIngredients.length + comparison.partialIngredients.length * 0.5;

  return Math.round((weightedMatches / comparison.totalCount) * 100);
}

export function getDefaultIngredientsForGroceryAdd(
  recipeIngredients: Ingredient[],
  pantryItems: PantryItem[],
) {
  const comparison = compareRecipeToPantry(recipeIngredients, pantryItems);
  return comparison.missingIngredients.map((match) => match.ingredient);
}

export function buildShoppingListPayloadFromIngredients({
  ingredients,
  userId,
  weekStartKey,
}: {
  ingredients: Ingredient[];
  userId: string;
  weekStartKey: string;
}) {
  const combinedIngredients = combineIngredients(ingredients);

  return combinedIngredients.map<ShoppingListItemInsert>((ingredient) => ({
    user_id: userId,
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    category: normalizeCategory(ingredient.category),
    checked: false,
    source: "manual",
    week_start: weekStartKey,
  }));
}

function matchIngredientToPantry(ingredient: Ingredient, pantryItems: PantryItem[]): PantryIngredientMatch {
  const normalizedIngredientName = normalizeIngredientName(ingredient.name);

  if (!normalizedIngredientName) {
    return {
      ingredient,
      normalizedIngredientName,
      pantryItem: null,
      status: "missing",
      reason: "not_found",
    };
  }

  const pantryMatch = findBestPantryMatch(normalizedIngredientName, pantryItems);

  if (!pantryMatch) {
    return {
      ingredient,
      normalizedIngredientName,
      pantryItem: null,
      status: "missing",
      reason: "not_found",
    };
  }

  const pantryItem = pantryMatch.item;
  const recipeQuantity = parseSimpleQuantity(ingredient.quantity);
  const pantryQuantity = toNullableNumber(pantryItem.quantity);
  const recipeUnit = normalizeMeasurementUnit(ingredient.unit);
  const pantryUnit = normalizeMeasurementUnit(pantryItem.unit);

  if (recipeQuantity === null) {
    return {
      ingredient,
      normalizedIngredientName,
      pantryItem,
      status: pantryMatch.score >= 3 ? "have" : "partial",
      reason: pantryMatch.score >= 3 ? "exact" : "fuzzy",
    };
  }

  if (pantryQuantity === null) {
    return {
      ingredient,
      normalizedIngredientName,
      pantryItem,
      status: "partial",
      reason: "quantity_unknown",
    };
  }

  if (recipeUnit && pantryUnit && !isCompatibleUnit(recipeUnit, pantryUnit)) {
    return {
      ingredient,
      normalizedIngredientName,
      pantryItem,
      status: "partial",
      reason: "unit_mismatch",
    };
  }

  if (!recipeUnit || !pantryUnit) {
    return {
      ingredient,
      normalizedIngredientName,
      pantryItem,
      status: "partial",
      reason: pantryQuantity >= recipeQuantity ? "quantity_unknown" : "insufficient_quantity",
    };
  }

  if (pantryQuantity >= recipeQuantity) {
    return {
      ingredient,
      normalizedIngredientName,
      pantryItem,
      status: "have",
      reason: pantryMatch.score >= 3 ? "exact" : "fuzzy",
    };
  }

  return {
    ingredient,
    normalizedIngredientName,
    pantryItem,
    status: "partial",
    reason: "insufficient_quantity",
  };
}

function findBestPantryMatch(normalizedIngredientName: string, pantryItems: PantryItem[]) {
  const scoredMatches = pantryItems
    .map((item) => {
      const normalizedPantryName = normalizeIngredientName(item.normalized_name || item.name);
      const score = scoreMatch(normalizedIngredientName, normalizedPantryName);

      return {
        item,
        normalizedPantryName,
        score,
      };
    })
    .filter((match) => match.score > 0)
    .sort((firstMatch, secondMatch) => secondMatch.score - firstMatch.score);

  return scoredMatches[0] ?? null;
}

function scoreMatch(ingredientName: string, pantryName: string) {
  if (!ingredientName || !pantryName) {
    return 0;
  }

  if (ingredientName === pantryName) {
    return 3;
  }

  if (ingredientName.includes(pantryName) || pantryName.includes(ingredientName)) {
    return 2;
  }

  const ingredientTokens = ingredientName.split(" ").filter(Boolean);
  const pantryTokens = pantryName.split(" ").filter(Boolean);

  if (ingredientTokens.length === 0 || pantryTokens.length === 0) {
    return 0;
  }

  const pantryTokenSet = new Set(pantryTokens);
  const sharedTokens = ingredientTokens.filter((token) => pantryTokenSet.has(token)).length;

  return sharedTokens / ingredientTokens.length >= 0.6 ? 1 : 0;
}

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value.trim();
  return cleanValue ? cleanValue : null;
}

function toNullableNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsedValue = Number.parseFloat(value.trim());
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

async function getSupabaseClient(supabase?: AppSupabaseClient) {
  if (supabase) {
    return supabase;
  }

  const { createClient } = await import("@/lib/supabase/client");
  return createClient();
}
