export type ImportedRecipeDraft = {
  title: string;
  description?: string | null;
  ingredients: string[];
  instructions: string[];
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  totalTimeMinutes?: number | null;
  servings?: number | null;
  imageUrl?: string | null;
  sourceUrl: string;
  sourceName?: string | null;
  author?: string | null;
  cuisine?: string | null;
  category?: string | null;
  tags?: string[];
  notes?: string[];
  importMethod: "spoonacular" | "jsonld";
};

export type ImportCompletionStatus = "complete" | "partial";

export type ImportUrlApiResponse = {
  recipe: ImportedRecipeDraft;
  status: ImportCompletionStatus;
  missingFields?: string[];
  message?: string;
};
