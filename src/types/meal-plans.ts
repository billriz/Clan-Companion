import type { Database } from "@/types/supabase";
import type { Recipe } from "@/types/recipes";

export type MealPlan = Database["public"]["Tables"]["meal_plans"]["Row"];
export type MealPlanInsert = Database["public"]["Tables"]["meal_plans"]["Insert"];
export type MealPlanUpdate = Database["public"]["Tables"]["meal_plans"]["Update"];

export type MealType = "Breakfast" | "Lunch" | "Dinner";

export type MealPlanWithRecipe = MealPlan & {
  recipe: Recipe | null;
};

export type MealPlanByDate = Record<string, Partial<Record<MealType, MealPlanWithRecipe>>>;
