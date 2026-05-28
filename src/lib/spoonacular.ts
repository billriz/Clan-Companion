import "server-only";

import {
  normalizePantryRecipeSearchResults,
  parsePantryRecipeSearchParams,
} from "@/lib/pantry-recipe-search";
import type {
  NormalizedImportedRecipe,
  NormalizedPantryRecipeResult,
  NormalizedSpoonacularSearchResult,
  SpoonacularComplexSearchResponse,
  SpoonacularErrorCode,
  SpoonacularExtendedIngredient,
  SpoonacularPantryRecipeSearchParams,
  SpoonacularInstructionBlock,
  SpoonacularRecipeDetails,
  SpoonacularRecipeSearchResult,
  SpoonacularSearchParams,
} from "@/types/spoonacular";

const SPOONACULAR_BASE_URL = "https://api.spoonacular.com";
const MAX_SUMMARY_LENGTH = 320;
const PANTRY_SEARCH_CACHE_TTL_MS = 1000 * 60 * 3;
const PANTRY_SEARCH_CACHE_MAX_ITEMS = 120;

type PantrySearchCacheEntry = {
  key: string;
  expiresAt: number;
  results: NormalizedPantryRecipeResult[];
};

const pantrySearchCache = new Map<string, PantrySearchCacheEntry>();

export class SpoonacularError extends Error {
  code: SpoonacularErrorCode;
  status: number;
  details?: unknown;

  constructor(message: string, code: SpoonacularErrorCode, status: number, details?: unknown) {
    super(message);
    this.name = "SpoonacularError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function searchSpoonacularRecipes(params: SpoonacularSearchParams): Promise<{
  results: NormalizedSpoonacularSearchResult[];
  totalResults?: number;
}> {
  const query = new URLSearchParams({
    addRecipeInformation: "true",
    fillIngredients: "true",
    instructionsRequired: "false",
  });

  if (params.query) {
    query.set("query", String(params.query));
  } else {
    query.set("sort", "popularity");
  }

  if (params.cuisine) {
    query.set("cuisine", String(params.cuisine));
  }

  if (params.diet) {
    query.set("diet", String(params.diet));
  }

  if (params.intolerances) {
    query.set("intolerances", String(params.intolerances));
  }

  if (params.maxReadyTime) {
    query.set("maxReadyTime", String(params.maxReadyTime));
  }

  if (params.number) {
    query.set("number", String(params.number));
  }

  const response = await fetchFromSpoonacular<SpoonacularComplexSearchResponse>(
    "/recipes/complexSearch",
    query,
  );

  const normalizedResults = Array.isArray(response.results)
    ? response.results.map(normalizeSearchResult).filter((result): result is NormalizedSpoonacularSearchResult => Boolean(result))
    : [];

  return {
    results: normalizedResults,
    totalResults: typeof response.totalResults === "number" ? response.totalResults : undefined,
  };
}

export async function searchRecipesFromPantry(
  params: SpoonacularPantryRecipeSearchParams,
): Promise<NormalizedPantryRecipeResult[]> {
  const parsed = parsePantryRecipeSearchParams(params);
  const cacheKey = parsed.ingredientNames.join(",");
  const now = Date.now();

  prunePantrySearchCache(now);

  const cached = pantrySearchCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.results;
  }

  const query = new URLSearchParams({
    ingredients: parsed.ingredientNames.join(","),
    number: String(parsed.number),
    ranking: String(parsed.ranking),
    ignorePantry: String(parsed.ignorePantry),
  });

  const payload = await fetchFromSpoonacular<unknown>("/recipes/findByIngredients", query);
  const normalizedResults = normalizePantryRecipeSearchResults(payload);

  if (!Array.isArray(payload)) {
    throw new SpoonacularError(
      "Spoonacular returned an unexpected recipe list format.",
      "BAD_RESPONSE",
      502,
      payload,
    );
  }

  pantrySearchCache.set(cacheKey, {
    key: cacheKey,
    expiresAt: now + PANTRY_SEARCH_CACHE_TTL_MS,
    results: normalizedResults,
  });

  prunePantrySearchCache(now);

  return normalizedResults;
}

export async function getSpoonacularRecipeInformation(id: number): Promise<SpoonacularRecipeDetails> {
  const query = new URLSearchParams({
    includeNutrition: "true",
  });

  return fetchFromSpoonacular<SpoonacularRecipeDetails>(`/recipes/${id}/information`, query);
}

export function normalizeSearchResult(
  recipe: SpoonacularRecipeSearchResult,
): NormalizedSpoonacularSearchResult | null {
  const recipeId = toPositiveInteger(recipe.id);
  const title = sanitizeText(recipe.title);

  if (!recipeId || !title) {
    return null;
  }

  return {
    id: recipeId,
    title,
    image: sanitizeUrl(recipe.image),
    readyInMinutes: toPositiveInteger(recipe.readyInMinutes),
    servings: toPositiveInteger(recipe.servings),
    sourceUrl: sanitizeUrl(recipe.sourceUrl),
    diets: normalizeTextArray(recipe.diets),
    dishTypes: normalizeTextArray(recipe.dishTypes),
    summary: sanitizeText(recipe.summary, MAX_SUMMARY_LENGTH),
  };
}

export function normalizeRecipeDetails(recipe: SpoonacularRecipeDetails): NormalizedImportedRecipe {
  const spoonacularId = toPositiveInteger(recipe.id);
  const title = sanitizeText(recipe.title);

  if (!spoonacularId || !title) {
    throw new SpoonacularError(
      "Spoonacular returned incomplete recipe data.",
      "BAD_RESPONSE",
      502,
      recipe,
    );
  }

  const readyInMinutes = toPositiveInteger(recipe.readyInMinutes);
  const prepTime = toPositiveInteger(recipe.preparationMinutes);
  const cookTime = toPositiveInteger(recipe.cookingMinutes);
  const fallbackPrepTime = prepTime ?? (cookTime === null ? readyInMinutes : null);

  const tags = normalizeTextArray([...(recipe.diets ?? []), ...(recipe.dishTypes ?? []), ...(recipe.cuisines ?? [])]).slice(
    0,
    24,
  );

  return {
    title,
    description: sanitizeText(recipe.summary, 640),
    image_url: sanitizeUrl(recipe.image),
    prep_time: fallbackPrepTime,
    cook_time: cookTime,
    servings: toPositiveInteger(recipe.servings),
    difficulty: mapDifficulty(recipe),
    category: mapCategory(recipe),
    tags,
    ingredients: extractIngredients(recipe),
    instructions: extractInstructions(recipe),
    source_url: sanitizeUrl(recipe.sourceUrl),
    spoonacular_id: spoonacularId,
    imported_from: "spoonacular",
    nutrition: extractNutrition(recipe),
  };
}

export function extractInstructions(recipe: SpoonacularRecipeDetails): string[] {
  const analyzedInstructions = Array.isArray(recipe.analyzedInstructions)
    ? recipe.analyzedInstructions
    : [];

  const steps = analyzedInstructions
    .flatMap((instruction: SpoonacularInstructionBlock) => {
      if (!Array.isArray(instruction.steps)) {
        return [];
      }

      return instruction.steps
        .map((step) => ({
          number: typeof step.number === "number" ? step.number : Number.MAX_SAFE_INTEGER,
          text: sanitizeText(step.step),
        }))
        .filter((step) => step.text)
        .sort((first, second) => first.number - second.number)
        .map((step) => step.text as string);
    })
    .filter(Boolean);

  if (steps.length > 0) {
    return steps;
  }

  const fallback = sanitizeText(recipe.instructions);

  if (!fallback) {
    return [];
  }

  return fallback
    .split(/\r?\n+/)
    .map((step) => step.trim())
    .filter(Boolean);
}

export function extractIngredients(recipe: SpoonacularRecipeDetails): Array<{
  quantity: string;
  unit: string;
  name: string;
}> {
  if (!Array.isArray(recipe.extendedIngredients)) {
    return [];
  }

  return recipe.extendedIngredients
    .map((ingredient: SpoonacularExtendedIngredient) => {
      const name = sanitizeText(ingredient.nameClean) ?? sanitizeText(ingredient.name) ?? "";

      if (!name) {
        return null;
      }

      return {
        quantity: formatQuantity(ingredient.amount),
        unit: sanitizeText(ingredient.unit) ?? "",
        name,
      };
    })
    .filter((ingredient): ingredient is { quantity: string; unit: string; name: string } =>
      Boolean(ingredient),
    );
}

export function extractNutrition(recipe: SpoonacularRecipeDetails): Record<string, unknown> {
  if (!recipe.nutrition || typeof recipe.nutrition !== "object" || Array.isArray(recipe.nutrition)) {
    return {};
  }

  return recipe.nutrition;
}

export function mapDifficulty(recipe: Pick<SpoonacularRecipeDetails, "readyInMinutes">): string {
  const readyInMinutes = toPositiveInteger(recipe.readyInMinutes);

  if (readyInMinutes !== null && readyInMinutes <= 30) {
    return "Easy";
  }

  if (readyInMinutes !== null && readyInMinutes <= 60) {
    return "Medium";
  }

  if (readyInMinutes !== null) {
    return "Hard";
  }

  return "Easy";
}

export function mapCategory(recipe: Pick<SpoonacularRecipeDetails, "dishTypes">): string {
  const firstDishType = normalizeTextArray(recipe.dishTypes ?? [])[0];
  return firstDishType ?? "Imported";
}

function getApiKey() {
  const apiKey = process.env.SPOONACULAR_API_KEY?.trim();

  if (!apiKey) {
    throw new SpoonacularError(
      "Spoonacular API key is missing. Add SPOONACULAR_API_KEY on the server.",
      "MISSING_API_KEY",
      500,
    );
  }

  return apiKey;
}

async function fetchFromSpoonacular<T>(path: string, query: URLSearchParams): Promise<T> {
  const apiKey = getApiKey();
  const requestQuery = new URLSearchParams(query);
  requestQuery.set("apiKey", apiKey);

  const url = `${SPOONACULAR_BASE_URL}${path}?${requestQuery.toString()}`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (error) {
    throw new SpoonacularError(
      "Could not reach Spoonacular. Please try again in a moment.",
      "NETWORK",
      502,
      error,
    );
  }

  const payload = await parsePayload(response);

  if (!response.ok) {
    throw mapSpoonacularError(response.status, payload);
  }

  return payload as T;
}

function prunePantrySearchCache(now = Date.now()) {
  for (const [cacheKey, entry] of pantrySearchCache.entries()) {
    if (entry.expiresAt <= now) {
      pantrySearchCache.delete(cacheKey);
    }
  }

  if (pantrySearchCache.size <= PANTRY_SEARCH_CACHE_MAX_ITEMS) {
    return;
  }

  const staleFirst = Array.from(pantrySearchCache.entries()).sort(
    (firstEntry, secondEntry) => firstEntry[1].expiresAt - secondEntry[1].expiresAt,
  );
  const overflowCount = pantrySearchCache.size - PANTRY_SEARCH_CACHE_MAX_ITEMS;

  staleFirst.slice(0, overflowCount).forEach(([cacheKey]) => {
    pantrySearchCache.delete(cacheKey);
  });
}

async function parsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      throw new SpoonacularError(
        "Spoonacular returned malformed JSON.",
        "BAD_RESPONSE",
        502,
      );
    }
  }

  const text = await response.text();
  return { message: text };
}

function mapSpoonacularError(status: number, payload: unknown) {
  const fallbackMessage = "Spoonacular request failed.";
  const message = readErrorMessage(payload) ?? fallbackMessage;

  if (status === 401 || status === 402 || status === 403) {
    return new SpoonacularError(
      "Spoonacular authentication failed. Please verify the API key.",
      "AUTH",
      502,
      payload,
    );
  }

  if (status === 404) {
    return new SpoonacularError("Recipe not found on Spoonacular.", "NOT_FOUND", 404, payload);
  }

  if (status === 429) {
    return new SpoonacularError(
      "Spoonacular rate limit reached. Please try again shortly.",
      "RATE_LIMIT",
      429,
      payload,
    );
  }

  if (status >= 400 && status < 500) {
    return new SpoonacularError(message, "BAD_RESPONSE", 400, payload);
  }

  return new SpoonacularError(message, "UNKNOWN", 502, payload);
}

function readErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }

  if (typeof record.error === "string" && record.error.trim()) {
    return record.error.trim();
  }

  return null;
}

function sanitizeUrl(value: unknown): string | null {
  const normalized = sanitizeText(value);

  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function sanitizeText(value: unknown, maxLength = 1000): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const withoutHtml = value.replace(/<[^>]*>/g, " ");
  const decoded = decodeHtmlEntities(withoutHtml);
  const squashed = decoded.replace(/\s+/g, " ").trim();

  if (!squashed) {
    return null;
  }

  if (squashed.length <= maxLength) {
    return squashed;
  }

  return `${squashed.slice(0, maxLength - 3).trimEnd()}...`;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeTextArray(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const unique = new Set<string>();

  values.forEach((value) => {
    const cleaned = sanitizeText(value);

    if (!cleaned) {
      return;
    }

    const key = cleaned.toLowerCase();

    if (!unique.has(key)) {
      unique.add(key);
    }
  });

  return Array.from(unique).map((item) => titleCase(item));
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatQuantity(amount: unknown): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return "";
  }

  const rounded = Number(amount.toFixed(2));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function toPositiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}
