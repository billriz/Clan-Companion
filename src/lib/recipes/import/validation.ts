import { z } from "zod";

export const MAX_IMPORT_URL_LENGTH = 2048;

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .max(maxLength)
    .transform((value) => value.trim())
    .optional()
    .nullable()
    .transform((value) => value ?? null);

const normalizedStringList = z
  .array(z.string().max(2000))
  .max(400)
  .default([])
  .transform((items) =>
    items
      .map((item) => item.trim())
      .filter(Boolean),
  );

const optionalPositiveInteger = z
  .number()
  .int()
  .positive()
  .max(100000)
  .nullable()
  .optional()
  .transform((value) => value ?? null);

export const importUrlRequestSchema = z.object({
  url: z.string().trim().min(1, "URL is required.").max(MAX_IMPORT_URL_LENGTH),
});

export const importedRecipeDraftSchema = z.object({
  title: z.string().max(200).default("").transform((value) => value.trim()),
  description: optionalTrimmedString(5000),
  ingredients: normalizedStringList,
  instructions: normalizedStringList,
  prepTimeMinutes: optionalPositiveInteger,
  cookTimeMinutes: optionalPositiveInteger,
  totalTimeMinutes: optionalPositiveInteger,
  servings: optionalPositiveInteger,
  imageUrl: optionalTrimmedString(2000),
  sourceUrl: z.string().trim().min(1).max(MAX_IMPORT_URL_LENGTH),
  sourceName: optionalTrimmedString(160),
  author: optionalTrimmedString(160),
  cuisine: optionalTrimmedString(120),
  category: optionalTrimmedString(120),
  tags: z
    .array(z.string().max(120))
    .max(60)
    .default([])
    .transform((items) =>
      items
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  importMethod: z.enum(["spoonacular", "jsonld"]),
});

export const saveImportedRecipeRequestSchema = z
  .object({
    draft: importedRecipeDraftSchema,
  })
  .superRefine(({ draft }, context) => {
    if (!draft.title) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recipe title is required.",
        path: ["draft", "title"],
      });
    }

    if (draft.ingredients.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one ingredient.",
        path: ["draft", "ingredients"],
      });
    }

    if (draft.instructions.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add at least one instruction step.",
        path: ["draft", "instructions"],
      });
    }
  });
