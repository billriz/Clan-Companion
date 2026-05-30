import {
  cleanText,
  getDraftCompletenessScore,
  inferSourceNameFromUrl,
  normalizeImportedRecipeDraft,
  normalizeInstructionText,
  normalizeTagInputs,
  parseIsoDurationToMinutes,
  parseServings,
} from "@/lib/recipes/import/normalize-recipe";
import type { ImportedRecipeDraft } from "@/lib/recipes/import/types";
import { safeFetchHtmlFromUrl } from "@/lib/recipes/import/url-safety";

export async function extractRecipeFromJsonLd(url: string): Promise<ImportedRecipeDraft | null> {
  const { html, finalUrl } = await safeFetchHtmlFromUrl(url);
  const drafts = extractRecipeDraftsFromJsonLdHtml(html, finalUrl);

  if (drafts.length === 0) {
    return null;
  }

  const ranked = drafts.sort((first, second) => getDraftCompletenessScore(second) - getDraftCompletenessScore(first));
  return ranked[0] ?? null;
}

export function extractRecipeDraftsFromJsonLdHtml(html: string, sourceUrl: string) {
  const scriptContents = extractJsonLdScriptContents(html);

  if (scriptContents.length === 0) {
    return [] as ImportedRecipeDraft[];
  }

  const recipeNodes: Record<string, unknown>[] = [];

  for (const scriptContent of scriptContents) {
    const parsedJson = parseJsonLdScript(scriptContent);

    if (!parsedJson) {
      continue;
    }

    collectRecipeNodes(parsedJson, recipeNodes, new Set<object>());
  }

  const drafts = recipeNodes
    .map((node) => mapJsonLdRecipeToDraft(node, sourceUrl))
    .filter((draft): draft is ImportedRecipeDraft => Boolean(draft));

  return drafts;
}

function mapJsonLdRecipeToDraft(node: Record<string, unknown>, sourceUrl: string): ImportedRecipeDraft | null {
  const title = cleanText(node.name, 200) ?? "";
  const description = cleanText(node.description, 1200);
  const ingredients = parseIngredients(node.recipeIngredient);
  const instructions = parseInstructions(node.recipeInstructions ?? node.instructions);

  const prepTimeMinutes = parseTimeToMinutes(node.prepTime);
  const cookTimeMinutes = parseTimeToMinutes(node.cookTime);
  const totalTimeMinutes = parseTimeToMinutes(node.totalTime);

  const sourceNameFromPublisher = parsePublisherName(node.publisher);

  const draft = normalizeImportedRecipeDraft({
    title,
    description,
    ingredients,
    instructions,
    prepTimeMinutes,
    cookTimeMinutes,
    totalTimeMinutes,
    servings: parseServings(node.recipeYield ?? node.yield ?? node.servings),
    imageUrl: parseImageUrl(node.image),
    sourceUrl,
    sourceName: sourceNameFromPublisher ?? inferSourceNameFromUrl(sourceUrl),
    author: parseAuthorName(node.author),
    cuisine: parseFirstText(node.recipeCuisine),
    category: parseFirstText(node.recipeCategory),
    tags: normalizeTagInputs([node.keywords, node.suitableForDiet, node.recipeCuisine, node.recipeCategory]),
    importMethod: "jsonld",
  });

  if (!draft.title && draft.ingredients.length === 0 && draft.instructions.length === 0) {
    return null;
  }

  return draft;
}

function parseIngredients(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => cleanText(entry, 280)).filter((entry): entry is string => Boolean(entry));
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n+/)
      .map((line) => cleanText(line, 280))
      .filter((line): line is string => Boolean(line));
  }

  return [];
}

function parseInstructions(value: unknown): string[] {
  if (typeof value === "string") {
    return normalizeInstructionText(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => parseInstructionEntry(entry));
  }

  if (value && typeof value === "object") {
    return parseInstructionEntry(value);
  }

  return [];
}

function parseInstructionEntry(value: unknown): string[] {
  if (typeof value === "string") {
    return normalizeInstructionText(value);
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const record = value as Record<string, unknown>;
  const types = readTypeNames(record["@type"]);

  if (types.includes("howtosection")) {
    const sectionName = cleanText(record.name, 120);
    const nested = parseInstructions(record.itemListElement);

    if (!sectionName) {
      return nested;
    }

    if (nested.length === 0) {
      return [sectionName];
    }

    return [`${sectionName}:`, ...nested];
  }

  if (types.includes("howtostep")) {
    const stepText = cleanText(record.text, 300) ?? cleanText(record.name, 300);
    return stepText ? [stepText] : [];
  }

  const directText = cleanText(record.text, 300) ?? cleanText(record.name, 300);

  if (directText) {
    return [directText];
  }

  if (record.itemListElement) {
    return parseInstructions(record.itemListElement);
  }

  return [];
}

function parseTimeToMinutes(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value);
    return rounded >= 0 ? rounded : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const fromIso = parseIsoDurationToMinutes(value);

  if (fromIso !== null) {
    return fromIso;
  }

  const digits = value.match(/\d+/)?.[0];

  if (!digits) {
    return null;
  }

  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseImageUrl(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string") {
        return entry;
      }

      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        const imageRecord = entry as Record<string, unknown>;

        if (typeof imageRecord.url === "string") {
          return imageRecord.url;
        }
      }
    }

    return null;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const imageRecord = value as Record<string, unknown>;

    if (typeof imageRecord.url === "string") {
      return imageRecord.url;
    }
  }

  return null;
}

function parseAuthorName(value: unknown): string | null {
  if (typeof value === "string") {
    return cleanText(value, 120);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const author = parseAuthorName(entry);

      if (author) {
        return author;
      }
    }

    return null;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const authorRecord = value as Record<string, unknown>;
    return cleanText(authorRecord.name, 120) ?? cleanText(authorRecord["@id"], 120);
  }

  return null;
}

function parsePublisherName(value: unknown): string | null {
  if (typeof value === "string") {
    return cleanText(value, 80);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const publisher = parsePublisherName(entry);

      if (publisher) {
        return publisher;
      }
    }

    return null;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const publisherRecord = value as Record<string, unknown>;
    return cleanText(publisherRecord.name, 80);
  }

  return null;
}

function parseFirstText(value: unknown) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const cleaned = cleanText(entry, 48);

      if (cleaned) {
        return cleaned;
      }
    }

    return null;
  }

  return cleanText(value, 48);
}

function extractJsonLdScriptContents(html: string) {
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const blocks: string[] = [];

  for (const match of html.matchAll(scriptRegex)) {
    const attributes = match[1] ?? "";
    const body = match[2] ?? "";

    if (!/type\s*=\s*(?:["'][^"']*application\/ld\+json[^"']*["']|application\/ld\+json)/i.test(attributes)) {
      continue;
    }

    const trimmed = body.trim();

    if (!trimmed) {
      continue;
    }

    blocks.push(trimmed);
  }

  return blocks;
}

function parseJsonLdScript(scriptBody: string): unknown {
  const withoutHtmlComments = scriptBody
    .replace(/^\s*<!--/, "")
    .replace(/-->\s*$/, "")
    .replace(/^\s*<!\[CDATA\[/, "")
    .replace(/\]\]>\s*$/, "")
    .trim();

  if (!withoutHtmlComments) {
    return null;
  }

  try {
    return JSON.parse(withoutHtmlComments);
  } catch {
    return null;
  }
}

function collectRecipeNodes(
  input: unknown,
  recipeNodes: Record<string, unknown>[],
  seen: Set<object>,
  depth = 0,
) {
  if (!input || depth > 14) {
    return;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      collectRecipeNodes(item, recipeNodes, seen, depth + 1);
    }

    return;
  }

  if (typeof input !== "object") {
    return;
  }

  if (seen.has(input)) {
    return;
  }

  seen.add(input);
  const record = input as Record<string, unknown>;

  if (isRecipeType(record["@type"])) {
    recipeNodes.push(record);
  }

  if (record["@graph"]) {
    collectRecipeNodes(record["@graph"], recipeNodes, seen, depth + 1);
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      collectRecipeNodes(value, recipeNodes, seen, depth + 1);
    }
  }
}

function isRecipeType(value: unknown) {
  return readTypeNames(value).includes("recipe");
}

function readTypeNames(value: unknown): string[] {
  if (typeof value === "string") {
    return [normalizeTypeName(value)];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? normalizeTypeName(entry) : ""))
      .filter(Boolean);
  }

  return [];
}

function normalizeTypeName(value: string) {
  const cleaned = value.trim().toLowerCase();

  if (cleaned.includes("/")) {
    return cleaned.split("/").pop() ?? cleaned;
  }

  return cleaned;
}
