import { z } from "zod";

import type { ImportedRecipeDraft } from "@/lib/recipes/import/types";

const trimmedStringSchema = z
  .union([z.string(), z.number(), z.boolean()])
  .transform((value) => String(value).trim())
  .catch("");

const nullableTrimmedStringSchema = z
  .union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || typeof value === "undefined") {
      return null;
    }

    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
  })
  .catch(null);

const nullableNonNegativeIntegerSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || typeof value === "undefined") {
      return null;
    }

    const parsed =
      typeof value === "number"
        ? Math.round(value)
        : Number.parseInt(String(value).trim(), 10);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return null;
    }

    return parsed;
  })
  .catch(null);

const nullablePositiveIntegerSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || typeof value === "undefined") {
      return null;
    }

    const parsed =
      typeof value === "number"
        ? Math.round(value)
        : Number.parseInt(String(value).trim(), 10);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  })
  .catch(null);

const stringArraySchema = z
  .array(trimmedStringSchema)
  .transform((items) => items.map((item) => item.trim()).filter(Boolean))
  .catch([]);

const tagsSchema = z
  .union([stringArraySchema, trimmedStringSchema])
  .transform((value) => {
    if (Array.isArray(value)) {
      return dedupeStrings(value);
    }

    return dedupeStrings(value.split(",").map((entry) => entry.trim()));
  })
  .catch([] as string[]);

const requiredHttpUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => isHttpUrl(value), {
    message: "That link doesn’t look valid. Try pasting the full recipe URL.",
  });

const nullableHttpUrlSchema = nullableTrimmedStringSchema.refine(
  (value) => value === null || isHttpUrl(value),
  {
    message: "Image URL must start with http:// or https://.",
  },
);

export const importUrlRequestSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Please paste a recipe URL.")
    .max(2048, "URL is too long. Please use a shorter link."),
});

export const importedRecipeDraftSchema = z.object({
  title: trimmedStringSchema,
  description: nullableTrimmedStringSchema,
  ingredients: stringArraySchema,
  instructions: stringArraySchema,
  prepTimeMinutes: nullableNonNegativeIntegerSchema,
  cookTimeMinutes: nullableNonNegativeIntegerSchema,
  totalTimeMinutes: nullableNonNegativeIntegerSchema,
  servings: nullablePositiveIntegerSchema,
  imageUrl: nullableHttpUrlSchema,
  sourceUrl: requiredHttpUrlSchema,
  sourceName: nullableTrimmedStringSchema,
  author: nullableTrimmedStringSchema,
  cuisine: nullableTrimmedStringSchema,
  category: nullableTrimmedStringSchema,
  tags: tagsSchema,
  notes: stringArraySchema,
  importMethod: z.enum(["spoonacular", "jsonld"]),
});

export const saveImportedRecipeRequestSchema = importedRecipeDraftSchema
  .refine((recipe) => recipe.title.trim().length > 0, {
    message: "Recipe title is required.",
    path: ["title"],
  })
  .refine((recipe) => recipe.ingredients.length > 0, {
    message: "Add at least one ingredient before saving.",
    path: ["ingredients"],
  })
  .refine((recipe) => recipe.instructions.length > 0, {
    message: "Add at least one instruction step before saving.",
    path: ["instructions"],
  });

export type ImportUrlRequest = z.infer<typeof importUrlRequestSchema>;
export type SaveImportedRecipeRequest = z.infer<typeof saveImportedRecipeRequestSchema>;

export function dedupeStrings(values: string[]) {
  const seen = new Set<string>();

  return values
    .map((value) => value.trim())
    .filter((value) => {
      if (!value) {
        return false;
      }

      const normalized = value.toLowerCase();

      if (seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    });
}

export function toImportedRecipeDraft(value: unknown): ImportedRecipeDraft | null {
  const parsed = importedRecipeDraftSchema.safeParse(value);
  return parsed.success ? (parsed.data as ImportedRecipeDraft) : null;
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
