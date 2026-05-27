import type { Database } from "@/types/supabase";
import type { Ingredient } from "@/types/recipes";

export type PantryItem = Database["public"]["Tables"]["pantry_items"]["Row"];
export type PantryItemInsert = Database["public"]["Tables"]["pantry_items"]["Insert"];
export type PantryItemUpdate = Database["public"]["Tables"]["pantry_items"]["Update"];

export const PANTRY_CATEGORIES = [
  "Produce",
  "Meat & Seafood",
  "Dairy",
  "Grains & Pasta",
  "Canned Goods",
  "Baking",
  "Spices",
  "Condiments",
  "Snacks",
  "Frozen",
  "Beverages",
  "Household",
  "Other",
] as const;

export const PANTRY_LOCATIONS = ["Pantry", "Fridge", "Freezer", "Other"] as const;

export type PantryCategory = (typeof PANTRY_CATEGORIES)[number];
export type PantryLocation = (typeof PANTRY_LOCATIONS)[number];

export type PantryMatchStatus = "have" | "missing" | "partial";

export type PantryIngredientMatch = {
  ingredient: Ingredient;
  normalizedIngredientName: string;
  pantryItem: PantryItem | null;
  status: PantryMatchStatus;
  reason:
    | "exact"
    | "fuzzy"
    | "not_found"
    | "insufficient_quantity"
    | "quantity_unknown"
    | "unit_mismatch";
};

export type PantryComparisonResult = {
  ingredientMatches: PantryIngredientMatch[];
  availableIngredients: PantryIngredientMatch[];
  missingIngredients: PantryIngredientMatch[];
  partialIngredients: PantryIngredientMatch[];
  matchPercentage: number;
  availableCount: number;
  totalCount: number;
};
