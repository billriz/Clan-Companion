import { dedupeStrings } from "@/lib/recipes/import/schemas";
import type { ImportedRecipeDraft } from "@/lib/recipes/import/types";

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1200;
const MAX_LINE_LENGTH = 280;
const MAX_TAG_LENGTH = 48;
const MAX_SOURCE_NAME_LENGTH = 80;
const MAX_AUTHOR_LENGTH = 120;
const MAX_NOTES = 12;
const MAX_ITEMS = 80;

export function normalizeImportedRecipeDraft(
  input: Partial<ImportedRecipeDraft> & Pick<ImportedRecipeDraft, "sourceUrl" | "importMethod">,
): ImportedRecipeDraft {
  const ingredients = normalizeLineArray(input.ingredients, MAX_ITEMS);
  const instructions = normalizeLineArray(input.instructions, MAX_ITEMS);
  const notes = normalizeLineArray(input.notes, MAX_NOTES);

  const prepTimeMinutes = normalizeNonNegativeInteger(input.prepTimeMinutes);
  const cookTimeMinutes = normalizeNonNegativeInteger(input.cookTimeMinutes);
  const explicitTotalTime = normalizeNonNegativeInteger(input.totalTimeMinutes);
  const inferredTotalTime =
    explicitTotalTime ??
    (prepTimeMinutes !== null || cookTimeMinutes !== null
      ? (prepTimeMinutes ?? 0) + (cookTimeMinutes ?? 0)
      : null);

  const tags = dedupeStrings((input.tags ?? []).map((tag) => cleanText(tag, MAX_TAG_LENGTH) ?? ""));

  const normalizedSourceUrl = normalizeHttpUrl(input.sourceUrl) ?? input.sourceUrl.trim();

  return {
    title: cleanText(input.title, MAX_TITLE_LENGTH) ?? "",
    description: cleanText(input.description, MAX_DESCRIPTION_LENGTH),
    ingredients,
    instructions,
    prepTimeMinutes,
    cookTimeMinutes,
    totalTimeMinutes: inferredTotalTime,
    servings: normalizePositiveInteger(input.servings),
    imageUrl: normalizeHttpUrl(input.imageUrl),
    sourceUrl: normalizedSourceUrl,
    sourceName:
      cleanText(input.sourceName, MAX_SOURCE_NAME_LENGTH) ?? inferSourceNameFromUrl(normalizedSourceUrl),
    author: cleanText(input.author, MAX_AUTHOR_LENGTH),
    cuisine: cleanText(input.cuisine, MAX_TAG_LENGTH),
    category: cleanText(input.category, MAX_TAG_LENGTH),
    tags,
    notes,
    importMethod: input.importMethod,
  };
}

export function collectMissingRequiredFields(recipe: Pick<ImportedRecipeDraft, "title" | "ingredients" | "instructions">) {
  const missing: string[] = [];
  const nonEmptyIngredients = normalizeLineArray(recipe.ingredients);
  const nonEmptyInstructions = normalizeLineArray(recipe.instructions);

  if (!recipe.title.trim()) {
    missing.push("title");
  }

  if (nonEmptyIngredients.length === 0) {
    missing.push("ingredients");
  }

  if (nonEmptyInstructions.length === 0) {
    missing.push("instructions");
  }

  return missing;
}

export function getDraftCompletenessScore(recipe: Partial<ImportedRecipeDraft>) {
  let score = 0;

  if (cleanText(recipe.title)) {
    score += 5;
  }

  const ingredients = normalizeLineArray(recipe.ingredients);
  const instructions = normalizeLineArray(recipe.instructions);

  score += Math.min(ingredients.length, 15) * 2;
  score += Math.min(instructions.length, 15) * 2;

  if (normalizeNonNegativeInteger(recipe.prepTimeMinutes) !== null) {
    score += 1;
  }

  if (normalizeNonNegativeInteger(recipe.cookTimeMinutes) !== null) {
    score += 1;
  }

  if (normalizePositiveInteger(recipe.servings) !== null) {
    score += 1;
  }

  if (cleanText(recipe.description)) {
    score += 1;
  }

  return score;
}

export function normalizeLineArray(input: unknown, maxItems = MAX_ITEMS) {
  if (!Array.isArray(input)) {
    return [];
  }

  const cleaned = input
    .map((item) => cleanText(item, MAX_LINE_LENGTH))
    .filter((value): value is string => Boolean(value));

  return cleaned.slice(0, maxItems);
}

export function normalizeInstructionText(value: unknown): string[] {
  const cleaned = cleanText(value, 16000);

  if (!cleaned) {
    return [];
  }

  const normalizedLines = cleaned
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (normalizedLines.length > 1) {
    return normalizedLines.map((line) => trimLinePrefix(line)).filter(Boolean);
  }

  return cleaned
    .split(/\s*(?:\d+\.|\d+\)|\u2022|•|-)\s+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 2)
    .map((segment) => trimLinePrefix(segment));
}

export function normalizeHttpUrl(input: unknown): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export function cleanText(input: unknown, maxLength = MAX_LINE_LENGTH): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const withoutTags = input.replace(/<[^>]*>/g, " ");
  const decoded = decodeHtmlEntities(withoutTags);
  const squashed = decoded.replace(/\s+/g, " ").trim();

  if (!squashed) {
    return null;
  }

  if (squashed.length <= maxLength) {
    return squashed;
  }

  return `${squashed.slice(0, maxLength - 3).trimEnd()}...`;
}

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function inferSourceNameFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const parts = hostname.split(".").filter(Boolean);

    const base =
      parts.length >= 2 && parts[parts.length - 1].length <= 3
        ? parts[parts.length - 2]
        : parts.length > 0
          ? parts[parts.length - 2] ?? parts[0]
          : "";

    if (!base) {
      return null;
    }

    return base
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  } catch {
    return null;
  }
}

export function parseIsoDurationToMinutes(value: unknown): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(
    /^P(?:([0-9]+)D)?(?:T(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?)?$/i,
  );

  if (!match) {
    return null;
  }

  const days = Number.parseInt(match[1] ?? "0", 10);
  const hours = Number.parseInt(match[2] ?? "0", 10);
  const minutes = Number.parseInt(match[3] ?? "0", 10);
  const seconds = Number.parseInt(match[4] ?? "0", 10);

  if (![days, hours, minutes, seconds].every((value) => Number.isFinite(value) && value >= 0)) {
    return null;
  }

  const total = days * 24 * 60 + hours * 60 + minutes + Math.round(seconds / 60);
  return total >= 0 ? total : null;
}

export function parseServings(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value);
    return rounded > 0 ? rounded : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const numericMatch = value.match(/\d+/);

  if (!numericMatch) {
    return null;
  }

  const parsed = Number.parseInt(numericMatch[0], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeTagInputs(values: unknown[]): string[] {
  return dedupeStrings(
    values
      .flatMap((value) => {
        if (Array.isArray(value)) {
          return value;
        }

        if (typeof value === "string" && value.includes(",")) {
          return value.split(",");
        }

        return [value];
      })
      .map((value) => cleanText(value, MAX_TAG_LENGTH) ?? "")
      .filter(Boolean),
  );
}

function normalizeNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded >= 0 ? rounded : null;
}

function normalizePositiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}

function trimLinePrefix(value: string) {
  return value.replace(/^(?:step\s*)?\d+[\).:-]?\s*/i, "").trim();
}
