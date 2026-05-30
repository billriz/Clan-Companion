import {
  cleanText,
  inferSourceNameFromUrl,
  normalizeImportedRecipeDraft,
  normalizeInstructionText,
  normalizeTagInputs,
  parseServings,
} from "@/lib/recipes/import/normalize-recipe";
import type { ImportedRecipeDraft } from "@/lib/recipes/import/types";

const SPOONACULAR_BASE_URL = "https://api.spoonacular.com";
const REQUEST_TIMEOUT_MS = 10000;

type SpoonacularExtractResponse = {
  title?: unknown;
  summary?: unknown;
  extendedIngredients?: unknown;
  analyzedInstructions?: unknown;
  instructions?: unknown;
  readyInMinutes?: unknown;
  preparationMinutes?: unknown;
  cookingMinutes?: unknown;
  servings?: unknown;
  image?: unknown;
  sourceUrl?: unknown;
  sourceName?: unknown;
  creditsText?: unknown;
  cuisines?: unknown;
  dishTypes?: unknown;
  diets?: unknown;
};

export async function extractRecipeWithSpoonacular(url: string): Promise<ImportedRecipeDraft | null> {
  const apiKey = process.env.SPOONACULAR_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const query = new URLSearchParams({
    apiKey,
    url,
  });

  const endpoint = `${SPOONACULAR_BASE_URL}/recipes/extract?${query.toString()}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    if ([401, 402, 403, 404, 408, 409, 429, 500, 502, 503, 504].includes(response.status)) {
      return null;
    }

    return null;
  }

  let payload: SpoonacularExtractResponse;

  try {
    payload = (await response.json()) as SpoonacularExtractResponse;
  } catch {
    return null;
  }

  const sourceUrl = normalizeSourceUrl(payload.sourceUrl, url);
  const ingredients = extractIngredientLines(payload.extendedIngredients);
  const instructions = extractInstructionLines(payload.analyzedInstructions, payload.instructions);

  const draft = normalizeImportedRecipeDraft({
    title: cleanText(payload.title, 200) ?? "",
    description: cleanText(payload.summary, 1200),
    ingredients,
    instructions,
    prepTimeMinutes: toNonNegativeInteger(payload.preparationMinutes),
    cookTimeMinutes: toNonNegativeInteger(payload.cookingMinutes),
    totalTimeMinutes: toNonNegativeInteger(payload.readyInMinutes),
    servings: parseServings(payload.servings),
    imageUrl: typeof payload.image === "string" ? payload.image : null,
    sourceUrl,
    sourceName:
      cleanText(payload.sourceName, 80) ??
      inferSourceNameFromUrl(sourceUrl) ??
      cleanText(payload.creditsText, 80),
    author: cleanText(payload.creditsText, 120),
    cuisine: firstString(payload.cuisines),
    category: firstString(payload.dishTypes),
    tags: normalizeTagInputs([payload.cuisines, payload.dishTypes, payload.diets]),
    importMethod: "spoonacular",
  });

  if (!hasUsefulContent(draft)) {
    return null;
  }

  return draft;
}

function extractIngredientLines(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const ingredient = entry as Record<string, unknown>;
      return (
        cleanText(ingredient.original, 280) ??
        cleanText(ingredient.originalString, 280) ??
        cleanText(ingredient.nameClean, 280) ??
        cleanText(ingredient.name, 280)
      );
    })
    .filter((entry): entry is string => Boolean(entry));
}

function extractInstructionLines(analyzed: unknown, instructions: unknown) {
  if (Array.isArray(analyzed)) {
    const steps = analyzed
      .flatMap((block) => {
        if (!block || typeof block !== "object" || Array.isArray(block)) {
          return [];
        }

        const candidateSteps = (block as { steps?: unknown }).steps;

        if (!Array.isArray(candidateSteps)) {
          return [];
        }

        return candidateSteps
          .map((step) => {
            if (!step || typeof step !== "object" || Array.isArray(step)) {
              return null;
            }

            const stepRecord = step as Record<string, unknown>;
            return {
              number:
                typeof stepRecord.number === "number" && Number.isFinite(stepRecord.number)
                  ? stepRecord.number
                  : Number.MAX_SAFE_INTEGER,
              text: cleanText(stepRecord.step, 280),
            };
          })
          .filter((step): step is { number: number; text: string } => Boolean(step?.text));
      })
      .sort((first, second) => first.number - second.number)
      .map((step) => step.text);

    if (steps.length > 0) {
      return steps;
    }
  }

  return normalizeInstructionText(instructions);
}

function normalizeSourceUrl(payloadSourceUrl: unknown, fallback: string) {
  if (typeof payloadSourceUrl === "string" && payloadSourceUrl.trim().length > 0) {
    return payloadSourceUrl.trim();
  }

  return fallback;
}

function toNonNegativeInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded >= 0 ? rounded : null;
}

function firstString(value: unknown) {
  if (Array.isArray(value)) {
    for (const candidate of value) {
      const cleaned = cleanText(candidate, 48);

      if (cleaned) {
        return cleaned;
      }
    }
  }

  return cleanText(value, 48);
}

function hasUsefulContent(recipe: ImportedRecipeDraft) {
  return Boolean(recipe.title || recipe.ingredients.length > 0 || recipe.instructions.length > 0);
}
