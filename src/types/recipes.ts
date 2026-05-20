import type { Database } from "@/types/supabase";

export type Recipe = Database["public"]["Tables"]["recipes"]["Row"];
export type RecipeInsert = Database["public"]["Tables"]["recipes"]["Insert"];
export type RecipeUpdate = Database["public"]["Tables"]["recipes"]["Update"];

export type Difficulty = "Easy" | "Medium" | "Hard";

export type Ingredient = {
  quantity: string;
  unit: string;
  name: string;
};

export type RecipeFormValues = {
  title: string;
  description: string;
  imageUrl: string | null;
  prepTime: string;
  cookTime: string;
  servings: string;
  difficulty: Difficulty;
  category: string;
  tags: string;
  ingredients: Ingredient[];
  instructions: string[];
};
