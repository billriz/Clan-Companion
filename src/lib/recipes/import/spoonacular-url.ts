import "server-only";

import {
  durationToMinutes,
  normalizeImportedRecipeDraft,
  sanitizeText,
  sanitizeUrl,
} from "@/lib/recipes/import/normalize-recipe";
import type { ImportedRecipeDraft } from "@/lib/recipes/import/types";

const SPOONACULAR_BASE_URL = "https://api.spoonacular.com";
const REQUEST_TIMEOUT_MS = 10_000;

export class SpoonacularUrlExtractionError extends Error {
  code: "RATE_LIMIT" | "AUTH" | "TIMEOUT" | "NETWORK" | "BAD_RESPONSE";

  constructor(
    message: string,
    code: "RATE_LIMIT" | "AUTH" | "TIMEOUT" | "NETWORK" | "BAD_RESPONSE",
  ) {
    super(message);
    this.name = "SpoonacularUrlExtractionError";
    this.code = code;
  }
}

type SpoonacularExtractIngredient = {
  original?: string | null;
  originalString?: string | null;
  name?: string | null;
  nameClean?: string | null;
  amount?: number | null;
  unit?: string | null;
};

type SpoonacularExtractStep = {
  step?: string | null;
  number?: number;
};

type SpoonacularExtractInstructionBlock = {
  steps?: SpoonacularExtractStep[];
};

type SpoonacularExtractResponse = {
  title?: string | null;
  summary?: string | null;
  image?: string | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  author?: string | null;
  creditsText?: string | null;
  cuisines?: string[];
  dishTypes?: string[];
  diets?: string[];
  servings?: number | null;
  preparationMinutes?: number | null;
  cookingMinutes?: number | null;
  readyInMinutes?: number | null;
  totalTime?: string | number | null;
  instructions?: string | null;
  analyzedInstructions?: SpoonacularExtractInstructionBlock[];
  extendedIngredients?: SpoonacularExtractIngredient[];
};

export async function extractRecipeWithSpoonacularUrl(url: string): Promise<ImportedRecipeDraft | null> {
  const apiKey = process.env.SPOONACULAR_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const query = new URLSearchParams({
    apiKey,
    url,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(`${SPOONACULAR_BASE_URL}/recipes/extract?${query.toString()}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new SpoonacularUrlExtractionError(
        "Recipe import is taking too long right now. Please try again.",
        "TIMEOUT",
      );
    }

    throw new SpoonacularUrlExtractionError(
      "Could not reach Spoonacular right now.",
      "NETWORK",
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new SpoonacularUrlExtractionError(
        "Spoonacular import is temporarily busy. Please try again in a minute.",
        "RATE_LIMIT",
      );
    }

    if (response.status === 401 || response.status === 402 || response.status === 403) {
      throw new SpoonacularUrlExtractionError(
        "Recipe import service is unavailable right now.",
        "AUTH",
      );
    }

    throw new SpoonacularUrlExtractionError(
      "Spoonacular could not extract this recipe URL.",
      "BAD_RESPONSE",
    );
  }

  let payload: SpoonacularExtractResponse;

  try {
    payload = (await response.json()) as SpoonacularExtractResponse;
  } catch {
    throw new SpoonacularUrlExtractionError(
      "Spoonacular returned malformed data.",
      "BAD_RESPONSE",
    );
  }

  return normalizeSpoonacularExtractPayload(payload, url);
}

function normalizeSpoonacularExtractPayload(
  payload: SpoonacularExtractResponse,
  fallbackSourceUrl: string,
): ImportedRecipeDraft {
  const sourceUrl = sanitizeUrl(payload.sourceUrl) ?? fallbackSourceUrl;
  const prepTimeMinutes = toPositiveInteger(payload.preparationMinutes);
  const cookTimeMinutes = toPositiveInteger(payload.cookingMinutes);
  const totalTimeMinutes =
    durationToMinutes(payload.totalTime) ?? toPositiveInteger(payload.readyInMinutes) ?? null;

  const ingredients = Array.isArray(payload.extendedIngredients)
    ? payload.extendedIngredients
        .map((ingredient) =>
          sanitizeText(ingredient.original, 500) ??
          sanitizeText(ingredient.originalString, 500) ??
          mergeIngredientParts(ingredient),
        )
        .filter((item): item is string => Boolean(item))
    : [];

  const instructions = extractInstructionSteps(payload);

  return normalizeImportedRecipeDraft({
    title: sanitizeText(payload.title, 200) ?? "",
    description: sanitizeText(payload.summary, 5000) ?? undefined,
    ingredients,
    instructions,
    prepTimeMinutes,
    cookTimeMinutes,
    totalTimeMinutes,
    servings: toPositiveInteger(payload.servings),
    imageUrl: sanitizeUrl(payload.image),
    sourceUrl,
    sourceName: sanitizeText(payload.sourceName, 160) ?? undefined,
    author:
      sanitizeText(payload.author, 160) ?? sanitizeText(payload.creditsText, 160) ?? undefined,
    cuisine: firstCleanString(payload.cuisines),
    category: firstCleanString(payload.dishTypes),
    tags: normalizeTagList([...safeArray(payload.diets), ...safeArray(payload.dishTypes)]),
    importMethod: "spoonacular",
  });
}

function extractInstructionSteps(payload: SpoonacularExtractResponse): string[] {
  const analyzedInstructions = Array.isArray(payload.analyzedInstructions)
    ? payload.analyzedInstructions
    : [];

  const steps = analyzedInstructions
    .flatMap((instructionBlock) =>
      Array.isArray(instructionBlock.steps)
        ? instructionBlock.steps
            .map((step) => sanitizeText(step.step, 4000))
            .filter((step): step is string => Boolean(step))
        : [],
    )
    .filter(Boolean);

  if (steps.length > 0) {
    return steps;
  }

  return sanitizeText(payload.instructions, 6000)
    ?.split(/\r?\n+/)
    .map((step) => step.trim())
    .filter(Boolean) ?? [];
}

function mergeIngredientParts(ingredient: SpoonacularExtractIngredient) {
  const amount = toPositiveNumberString(ingredient.amount);
  const unit = sanitizeText(ingredient.unit, 40) ?? "";
  const name =
    sanitizeText(ingredient.nameClean, 300) ?? sanitizeText(ingredient.name, 300) ?? "";

  const merged = [amount, unit, name].filter(Boolean).join(" ").trim();
  return merged || null;
}

function safeArray(values: string[] | undefined): string[] {
  return Array.isArray(values) ? values : [];
}

function normalizeTagList(values: string[]) {
  const seen = new Set<string>();
  const tags: string[] = [];

  values.forEach((value) => {
    const cleaned = sanitizeText(value, 120);

    if (!cleaned) {
      return;
    }

    const key = cleaned.toLowerCase();

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    tags.push(cleaned);
  });

  return tags.slice(0, 30);
}

function firstCleanString(values: string[] | undefined): string | undefined {
  if (!Array.isArray(values)) {
    return undefined;
  }

  for (const value of values) {
    const cleaned = sanitizeText(value, 120);

    if (cleaned) {
      return cleaned;
    }
  }

  return undefined;
}

function toPositiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}

function toPositiveNumberString(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "";
  }

  const rounded = Number(value.toFixed(2));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
