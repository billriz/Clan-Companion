export type SpoonacularSearchParams = {
  query?: string;
  cuisine?: string;
  diet?: string;
  intolerances?: string;
  maxReadyTime?: string | number;
  number?: string | number;
};

export type SpoonacularRecipeSearchResult = {
  id?: number;
  title?: string;
  image?: string | null;
  readyInMinutes?: number | null;
  servings?: number | null;
  sourceUrl?: string | null;
  diets?: string[];
  dishTypes?: string[];
  cuisines?: string[];
  summary?: string | null;
};

export type SpoonacularComplexSearchResponse = {
  results?: SpoonacularRecipeSearchResult[];
  totalResults?: number;
};

export type SpoonacularExtendedIngredient = {
  amount?: number | null;
  unit?: string | null;
  name?: string | null;
  nameClean?: string | null;
};

export type SpoonacularInstructionStep = {
  number?: number;
  step?: string | null;
};

export type SpoonacularInstructionBlock = {
  name?: string;
  steps?: SpoonacularInstructionStep[];
};

export type SpoonacularRecipeDetails = {
  id?: number;
  title?: string;
  summary?: string | null;
  image?: string | null;
  readyInMinutes?: number | null;
  preparationMinutes?: number | null;
  cookingMinutes?: number | null;
  servings?: number | null;
  sourceUrl?: string | null;
  diets?: string[];
  dishTypes?: string[];
  cuisines?: string[];
  extendedIngredients?: SpoonacularExtendedIngredient[];
  analyzedInstructions?: SpoonacularInstructionBlock[];
  instructions?: string | null;
  nutrition?: Record<string, unknown> | null;
};

export type NormalizedSpoonacularSearchResult = {
  id: number;
  title: string;
  image: string | null;
  readyInMinutes: number | null;
  servings: number | null;
  sourceUrl: string | null;
  diets: string[];
  dishTypes: string[];
  summary?: string | null;
};

export type NormalizedImportedRecipe = {
  title: string;
  description: string | null;
  image_url: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  difficulty: string;
  category: string | null;
  tags: string[];
  ingredients: Array<{
    quantity: string;
    unit: string;
    name: string;
  }>;
  instructions: string[];
  source_url: string | null;
  spoonacular_id: number;
  imported_from: "spoonacular";
  nutrition: Record<string, unknown>;
};

export type SpoonacularErrorCode =
  | "MISSING_API_KEY"
  | "RATE_LIMIT"
  | "AUTH"
  | "NOT_FOUND"
  | "BAD_RESPONSE"
  | "NETWORK"
  | "UNKNOWN";
