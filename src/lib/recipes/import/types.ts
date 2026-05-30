export type ImportMethod = "spoonacular" | "jsonld";

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
  tags: string[];
  importMethod: ImportMethod;
};

export type SaveImportedRecipeInput = {
  draft: ImportedRecipeDraft;
};

export type ImportErrorCode =
  | "INVALID_URL"
  | "UNSAFE_URL"
  | "URL_TOO_LONG"
  | "UNSUPPORTED_PROTOCOL"
  | "AUTH_REQUIRED"
  | "PREMIUM_REQUIRED"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "NETWORK"
  | "EXTRACTION_FAILED"
  | "SAVE_FAILED"
  | "INVALID_DRAFT"
  | "UNKNOWN";
