import type { ImportMethod, ImportedRecipeDraft } from "@/lib/recipes/import/types";
import { importedRecipeDraftSchema } from "@/lib/recipes/import/validation";

type NormalizeDraftInput = Partial<Omit<ImportedRecipeDraft, "sourceUrl" | "importMethod">> & {
  sourceUrl: string;
  importMethod: ImportMethod;
};

export function normalizeImportedRecipeDraft(input: NormalizeDraftInput): ImportedRecipeDraft {
  const title = sanitizeText(input.title, 200) ?? "";
  const description = sanitizeText(input.description, 5000);
  const sourceUrl = sanitizeUrl(input.sourceUrl) ?? input.sourceUrl;

  const normalized: ImportedRecipeDraft = {
    title,
    description: description ?? undefined,
    ingredients: normalizeIngredients(input.ingredients),
    instructions: normalizeInstructions(input.instructions),
    prepTimeMinutes: toPositiveInteger(input.prepTimeMinutes),
    cookTimeMinutes: toPositiveInteger(input.cookTimeMinutes),
    totalTimeMinutes: toPositiveInteger(input.totalTimeMinutes),
    servings: toPositiveInteger(input.servings),
    imageUrl: sanitizeUrl(input.imageUrl),
    sourceUrl,
    sourceName: sanitizeText(input.sourceName, 160) ?? inferSourceNameFromUrl(sourceUrl),
    author: sanitizeText(input.author, 160),
    cuisine: sanitizeText(input.cuisine, 120),
    category: sanitizeText(input.category, 120),
    tags: normalizeTags(input.tags),
    importMethod: input.importMethod,
  };

  return importedRecipeDraftSchema.parse(normalized);
}

export function hasRequiredRecipeFields(draft: ImportedRecipeDraft) {
  return Boolean(draft.title.trim()) && draft.ingredients.length > 0 && draft.instructions.length > 0;
}

export function getMissingRequiredFieldLabels(draft: ImportedRecipeDraft): string[] {
  const missing: string[] = [];

  if (!draft.title.trim()) {
    missing.push("title");
  }

  if (draft.ingredients.length === 0) {
    missing.push("ingredients");
  }

  if (draft.instructions.length === 0) {
    missing.push("instructions");
  }

  return missing;
}

export function durationToMinutes(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return toPositiveInteger(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    return toPositiveInteger(Number.parseInt(trimmed, 10));
  }

  const durationMatch = trimmed.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i,
  );

  if (!durationMatch) {
    return null;
  }

  const days = Number.parseInt(durationMatch[1] ?? "0", 10) || 0;
  const hours = Number.parseInt(durationMatch[2] ?? "0", 10) || 0;
  const minutes = Number.parseInt(durationMatch[3] ?? "0", 10) || 0;
  const seconds = Number.parseInt(durationMatch[4] ?? "0", 10) || 0;

  const totalMinutes = days * 24 * 60 + hours * 60 + minutes + (seconds >= 30 ? 1 : 0);
  return toPositiveInteger(totalMinutes);
}

export function normalizeInstructions(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return splitInstructionText(value);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  const steps: string[] = [];

  value.forEach((item) => {
    if (!item) {
      return;
    }

    if (typeof item === "string") {
      steps.push(...splitInstructionText(item));
      return;
    }

    if (typeof item !== "object" || Array.isArray(item)) {
      return;
    }

    const record = item as Record<string, unknown>;
    const textCandidate =
      sanitizeText(record.text, 4000) ??
      sanitizeText(record.name, 4000) ??
      sanitizeText(record.step, 4000) ??
      sanitizeText(record.item, 4000);

    if (textCandidate) {
      steps.push(...splitInstructionText(textCandidate));
    }
  });

  return dedupeAndClean(steps);
}

export function normalizeIngredients(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return dedupeAndClean([sanitizeText(value, 500) ?? ""]);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  const items: string[] = [];

  value.forEach((item) => {
    if (!item) {
      return;
    }

    if (typeof item === "string") {
      const cleaned = sanitizeText(item, 500);

      if (cleaned) {
        items.push(cleaned);
      }

      return;
    }

    if (typeof item !== "object" || Array.isArray(item)) {
      return;
    }

    const record = item as Record<string, unknown>;

    const textValue =
      sanitizeText(record.text, 500) ??
      sanitizeText(record.original, 500) ??
      sanitizeText(record.name, 300);

    if (textValue) {
      items.push(textValue);
      return;
    }

    const quantity = sanitizeText(record.quantity, 40) ?? sanitizeText(record.amount, 40) ?? "";
    const unit = sanitizeText(record.unit, 40) ?? "";
    const name = sanitizeText(record.ingredient, 300) ?? sanitizeText(record.nameClean, 300) ?? "";

    const merged = [quantity, unit, name].filter(Boolean).join(" ").trim();

    if (merged) {
      items.push(merged);
    }
  });

  return dedupeAndClean(items);
}

export function sanitizeText(value: unknown, maxLength = 2000): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const withoutTags = value.replace(/<[^>]*>/g, " ");
  const decoded = decodeHtmlEntities(withoutTags);
  const collapsed = decoded.replace(/\s+/g, " ").trim();

  if (!collapsed) {
    return null;
  }

  if (collapsed.length <= maxLength) {
    return collapsed;
  }

  return `${collapsed.slice(0, maxLength - 3).trimEnd()}...`;
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, decimal: string) => {
      const code = Number.parseInt(decimal, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    });
}

export function sanitizeUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

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

export function inferSourceNameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, "").trim();
    return host || null;
  } catch {
    return null;
  }
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const tags: string[] = [];

  value.forEach((item) => {
    const cleaned = sanitizeText(item, 120);

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

  return tags.slice(0, 60);
}

function splitInstructionText(value: string): string[] {
  const cleaned = sanitizeText(value, 6000);

  if (!cleaned) {
    return [];
  }

  const splitByNewLine = cleaned
    .split(/\r?\n+/)
    .map((item) => item.replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean);

  if (splitByNewLine.length > 1) {
    return dedupeAndClean(splitByNewLine);
  }

  const splitByNumbering = cleaned
    .split(/\s(?=\d+[.)]\s)/)
    .map((item) => item.replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean);

  if (splitByNumbering.length > 1) {
    return dedupeAndClean(splitByNumbering);
  }

  return [cleaned];
}

function dedupeAndClean(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  values.forEach((value) => {
    const cleaned = value.trim();

    if (!cleaned) {
      return;
    }

    const key = cleaned.toLowerCase();

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    output.push(cleaned);
  });

  return output;
}

function toPositiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
}
