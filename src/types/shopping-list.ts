import type { Database } from "@/types/supabase";

export type ShoppingListItem = Database["public"]["Tables"]["shopping_list_items"]["Row"];
export type ShoppingListItemInsert =
  Database["public"]["Tables"]["shopping_list_items"]["Insert"];
export type ShoppingListItemUpdate =
  Database["public"]["Tables"]["shopping_list_items"]["Update"];
export type ShoppingList = Database["public"]["Tables"]["shopping_lists"]["Row"];
export type ShoppingListInsert = Database["public"]["Tables"]["shopping_lists"]["Insert"];
export type ShoppingListExport = Database["public"]["Tables"]["shopping_list_exports"]["Row"];

export const SHOPPING_CATEGORIES = [
  "Produce",
  "Meat & Seafood",
  "Dairy",
  "Bakery",
  "Pantry",
  "Frozen",
  "Spices & Seasonings",
  "Beverages",
  "Other",
] as const;

export type ShoppingCategory = (typeof SHOPPING_CATEGORIES)[number];
export type ShoppingSource = "meal_plan" | "manual";

export type CombinedShoppingIngredient = {
  name: string;
  quantity: string | null;
  unit: string | null;
  category: ShoppingCategory;
};
