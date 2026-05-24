import { z } from "zod";

export const RECIPE_SCAN_SOURCE_TYPES = [
  "recipe_card",
  "cookbook_snippet",
  "handwritten_recipe",
  "printed_recipe",
  "unknown",
] as const;

export type RecipeScanSourceType = (typeof RECIPE_SCAN_SOURCE_TYPES)[number];

export const recipeScanSourceTypeSchema = z.enum(RECIPE_SCAN_SOURCE_TYPES).catch("unknown");

export const RECIPE_SCAN_MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

export const RECIPE_SCAN_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const RECIPE_SCAN_HEIC_MIME_TYPES = ["image/heic", "image/heif"] as const;

const confidenceSchema = z.coerce.number().finite().min(0).max(1).catch(0);

const trimmedNullableStringSchema = z
  .union([z.string(), z.null()])
  .transform((value) => {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })
  .catch(null);

const trimmedStringSchema = z
  .union([z.string(), z.number(), z.boolean()])
  .transform((value) => String(value).trim())
  .catch("");

const strictNullableStringSchema = z.union([z.string(), z.null()]);

export const recipeScanModelOutputSchema = z.object({
  isRecipe: z.boolean(),
  title: strictNullableStringSchema,
  description: strictNullableStringSchema,
  servings: z.union([z.string(), z.number(), z.null()]),
  prepTimeMinutes: z.number().int().nonnegative().nullable(),
  cookTimeMinutes: z.number().int().nonnegative().nullable(),
  totalTimeMinutes: z.number().int().nonnegative().nullable(),
  ingredients: z.array(
    z.object({
      originalText: z.string(),
      quantity: strictNullableStringSchema,
      unit: strictNullableStringSchema,
      name: strictNullableStringSchema,
      preparation: strictNullableStringSchema,
      optional: z.boolean(),
      confidence: z.number().min(0).max(1),
    }),
  ),
  instructions: z.array(
    z.object({
      stepNumber: z.number().int().positive(),
      text: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
  notes: z.array(z.string()),
  tags: z.array(z.string()),
  cuisine: strictNullableStringSchema,
  mealType: strictNullableStringSchema,
  sourceType: z.enum(RECIPE_SCAN_SOURCE_TYPES),
  confidenceScore: z.number().min(0).max(1),
  missingFields: z.array(z.string()),
  warnings: z.array(z.string()),
  rawExtractedText: z.string(),
});

export const recipeScanIngredientSchema = z.object({
  originalText: trimmedStringSchema,
  quantity: trimmedNullableStringSchema,
  unit: trimmedNullableStringSchema,
  name: trimmedNullableStringSchema,
  preparation: trimmedNullableStringSchema,
  optional: z.boolean().catch(false),
  confidence: confidenceSchema,
});

export const recipeScanInstructionSchema = z.object({
  stepNumber: z.coerce.number().int().positive().catch(1),
  text: trimmedStringSchema,
  confidence: confidenceSchema,
});

export const recipeScanResultSchema = z.object({
  isRecipe: z.boolean().catch(false),
  title: trimmedNullableStringSchema,
  description: trimmedNullableStringSchema,
  servings: z.union([z.string(), z.number(), z.null()]).catch(null),
  prepTimeMinutes: z.coerce.number().int().nonnegative().nullable().catch(null),
  cookTimeMinutes: z.coerce.number().int().nonnegative().nullable().catch(null),
  totalTimeMinutes: z.coerce.number().int().nonnegative().nullable().catch(null),
  ingredients: z.array(recipeScanIngredientSchema).catch([]),
  instructions: z.array(recipeScanInstructionSchema).catch([]),
  notes: z.array(trimmedStringSchema).catch([]),
  tags: z.array(trimmedStringSchema).catch([]),
  cuisine: trimmedNullableStringSchema,
  mealType: trimmedNullableStringSchema,
  sourceType: recipeScanSourceTypeSchema,
  confidenceScore: confidenceSchema,
  missingFields: z.array(trimmedStringSchema).catch([]),
  warnings: z.array(trimmedStringSchema).catch([]),
  rawExtractedText: trimmedStringSchema,
});

export type RecipeScanResult = z.infer<typeof recipeScanResultSchema>;

export const recipeScanApiResponseSchema = z.object({
  extractedRecipe: recipeScanResultSchema,
  rawText: z.string().catch(""),
  confidence: confidenceSchema,
  missingFields: z.array(trimmedStringSchema).catch([]),
  warnings: z.array(trimmedStringSchema).catch([]),
  originalImagePath: z.string().nullable().catch(null),
  originalImageUrl: z.string().nullable().catch(null),
  scanModel: z.string().catch(""),
});

export type RecipeScanApiResponse = z.infer<typeof recipeScanApiResponseSchema>;

export const recipeScanSaveIngredientSchema = z.object({
  originalText: trimmedStringSchema.catch(""),
  quantity: trimmedNullableStringSchema,
  unit: trimmedNullableStringSchema,
  name: trimmedNullableStringSchema,
  preparation: trimmedNullableStringSchema,
  optional: z.boolean().catch(false),
  confidence: confidenceSchema,
});

export const recipeScanSaveInstructionSchema = z.object({
  stepNumber: z.coerce.number().int().positive().catch(1),
  text: trimmedStringSchema,
  confidence: confidenceSchema,
});

export const recipeScanSavePayloadSchema = z.object({
  title: z.string().trim().min(1, "Recipe title is required."),
  description: trimmedNullableStringSchema,
  servings: z.union([z.string(), z.number(), z.null()]).catch(null),
  prepTimeMinutes: z.coerce.number().int().nonnegative().nullable().catch(null),
  cookTimeMinutes: z.coerce.number().int().nonnegative().nullable().catch(null),
  totalTimeMinutes: z.coerce.number().int().nonnegative().nullable().catch(null),
  ingredients: z.array(recipeScanSaveIngredientSchema).catch([]),
  instructions: z.array(recipeScanSaveInstructionSchema).catch([]),
  notes: z.array(trimmedStringSchema).catch([]),
  tags: z.array(trimmedStringSchema).catch([]),
  cuisine: trimmedNullableStringSchema,
  mealType: trimmedNullableStringSchema,
  sourceType: recipeScanSourceTypeSchema,
  confidenceScore: confidenceSchema,
  missingFields: z.array(trimmedStringSchema).catch([]),
  warnings: z.array(trimmedStringSchema).catch([]),
  rawExtractedText: trimmedStringSchema,
  originalImagePath: z.string().nullable().catch(null),
  originalImageUrl: z.string().nullable().catch(null),
  scanModel: z.string().trim().min(1).catch(""),
});

export type RecipeScanSavePayload = z.infer<typeof recipeScanSavePayloadSchema>;

export function normalizeRecipeScanSourceType(
  input: string | null | undefined,
): RecipeScanSourceType {
  return recipeScanSourceTypeSchema.parse(input ?? "unknown");
}

export function normalizeNullableString(input: string | null | undefined) {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}
