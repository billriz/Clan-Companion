import "server-only";

import {
  durationToMinutes,
  normalizeImportedRecipeDraft,
  sanitizeText,
  sanitizeUrl,
} from "@/lib/recipes/import/normalize-recipe";
import type { ImportedRecipeDraft } from "@/lib/recipes/import/types";
import { fetchRecipePageHtml } from "@/lib/recipes/import/fetch-html";

export async function extractRecipeFromJsonLd(url: string): Promise<ImportedRecipeDraft | null> {
  const { html, finalUrl } = await fetchRecipePageHtml(url);
  const recipeNodes = findRecipeNodesFromHtml(html);

  if (recipeNodes.length === 0) {
    return null;
  }

  const bestMatch = pickBestRecipeNode(recipeNodes);

  if (!bestMatch) {
    return null;
  }

  return normalizeJsonLdRecipe(bestMatch, finalUrl);
}

function findRecipeNodesFromHtml(html: string): Record<string, unknown>[] {
  const scriptRegex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const nodes: Record<string, unknown>[] = [];

  for (const match of html.matchAll(scriptRegex)) {
    const rawContent = match[1];

    if (!rawContent) {
      continue;
    }

    const cleanedContent = cleanJsonLdScriptContent(rawContent);
    const parsedPayload = safeJsonParse(cleanedContent);

    if (parsedPayload === null) {
      continue;
    }

    nodes.push(...collectRecipeNodes(parsedPayload));
  }

  return nodes;
}

function collectRecipeNodes(payload: unknown): Record<string, unknown>[] {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload.flatMap((item) => collectRecipeNodes(item));
  }

  if (typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const nodes: Record<string, unknown>[] = [];

  if (isRecipeType(record["@type"])) {
    nodes.push(record);
  }

  if (record["@graph"]) {
    nodes.push(...collectRecipeNodes(record["@graph"]));
  }

  if (record.mainEntity) {
    nodes.push(...collectRecipeNodes(record.mainEntity));
  }

  if (record.itemListElement) {
    nodes.push(...collectRecipeNodes(record.itemListElement));
  }

  return nodes;
}

function pickBestRecipeNode(nodes: Record<string, unknown>[]) {
  let bestNode: Record<string, unknown> | null = null;
  let bestScore = -1;

  nodes.forEach((node) => {
    const score = scoreRecipeNode(node);

    if (score > bestScore) {
      bestScore = score;
      bestNode = node;
    }
  });

  return bestNode;
}

function scoreRecipeNode(node: Record<string, unknown>) {
  const title = sanitizeText(node.name, 200);
  const ingredients = normalizeIngredients(node.recipeIngredient);
  const instructions = normalizeInstructions(node.recipeInstructions);

  let score = 0;

  if (title) {
    score += 5;
  }

  if (ingredients.length > 0) {
    score += Math.min(ingredients.length, 20);
  }

  if (instructions.length > 0) {
    score += Math.min(instructions.length, 20);
  }

  if (sanitizeText(node.description, 5000)) {
    score += 3;
  }

  return score;
}

function normalizeJsonLdRecipe(recipeNode: Record<string, unknown>, fallbackSourceUrl: string) {
  const sourceUrl =
    sanitizeUrl(readSourceUrl(recipeNode)) ?? sanitizeUrl(fallbackSourceUrl) ?? fallbackSourceUrl;

  const prepTimeMinutes = durationToMinutes(recipeNode.prepTime);
  const cookTimeMinutes = durationToMinutes(recipeNode.cookTime);
  const totalTimeMinutes = durationToMinutes(recipeNode.totalTime);

  const ingredients = normalizeIngredients(recipeNode.recipeIngredient);
  const instructions = normalizeInstructions(recipeNode.recipeInstructions);

  return normalizeImportedRecipeDraft({
    title: sanitizeText(recipeNode.name, 200) ?? "",
    description: sanitizeText(recipeNode.description, 5000) ?? undefined,
    ingredients,
    instructions,
    prepTimeMinutes,
    cookTimeMinutes,
    totalTimeMinutes,
    servings: normalizeServings(recipeNode.recipeYield),
    imageUrl: normalizeImageUrl(recipeNode.image),
    sourceUrl,
    sourceName: readPublisherName(recipeNode),
    author: normalizeAuthor(recipeNode.author),
    cuisine: firstValue(recipeNode.recipeCuisine),
    category: firstValue(recipeNode.recipeCategory),
    tags: normalizeTagList(recipeNode.keywords),
    importMethod: "jsonld",
  });
}

function normalizeIngredients(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return sanitizeText(item, 500);
      }

      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const record = item as Record<string, unknown>;
      return sanitizeText(record.text, 500) ?? sanitizeText(record.name, 500) ?? null;
    })
    .filter((item): item is string => Boolean(item));
}

function normalizeInstructions(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (typeof value === "string") {
    return splitInstructionString(value);
  }

  if (!Array.isArray(value)) {
    if (typeof value === "object") {
      return flattenInstructionNode(value as Record<string, unknown>);
    }

    return [];
  }

  return value
    .flatMap((entry) => {
      if (typeof entry === "string") {
        return splitInstructionString(entry);
      }

      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return [];
      }

      return flattenInstructionNode(entry as Record<string, unknown>);
    })
    .map((step) => step.trim())
    .filter(Boolean);
}

function flattenInstructionNode(node: Record<string, unknown>): string[] {
  const directText =
    sanitizeText(node.text, 4000) ?? sanitizeText(node.name, 4000) ?? sanitizeText(node.step, 4000);

  if (directText) {
    return splitInstructionString(directText);
  }

  const nested = node.itemListElement;

  if (!Array.isArray(nested)) {
    return [];
  }

  return nested.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    return flattenInstructionNode(item as Record<string, unknown>);
  });
}

function splitInstructionString(value: string) {
  const cleaned = sanitizeText(value, 6000);

  if (!cleaned) {
    return [];
  }

  const fromNewLines = cleaned
    .split(/\r?\n+/)
    .map((step) => step.replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean);

  if (fromNewLines.length > 1) {
    return fromNewLines;
  }

  const fromNumberedText = cleaned
    .split(/\s(?=\d+[.)]\s)/)
    .map((step) => step.replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean);

  if (fromNumberedText.length > 1) {
    return fromNumberedText;
  }

  return [cleaned];
}

function normalizeServings(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value);
    return rounded > 0 ? rounded : null;
  }

  if (typeof value === "string") {
    const match = value.match(/\d+/);

    if (!match) {
      return null;
    }

    const parsed = Number.parseInt(match[0], 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = normalizeServings(entry);

      if (parsed !== null) {
        return parsed;
      }
    }
  }

  return null;
}

function normalizeImageUrl(image: unknown): string | null {
  if (typeof image === "string") {
    return sanitizeUrl(image);
  }

  if (Array.isArray(image)) {
    for (const imageEntry of image) {
      const parsed = normalizeImageUrl(imageEntry);

      if (parsed) {
        return parsed;
      }
    }

    return null;
  }

  if (!image || typeof image !== "object") {
    return null;
  }

  const record = image as Record<string, unknown>;

  return (
    sanitizeUrl(record.url) ??
    sanitizeUrl(record.contentUrl) ??
    sanitizeUrl(record["@id"]) ??
    null
  );
}

function normalizeAuthor(value: unknown): string | null {
  if (typeof value === "string") {
    return sanitizeText(value, 160);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = normalizeAuthor(entry);

      if (parsed) {
        return parsed;
      }
    }

    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  return sanitizeText(record.name, 160) ?? sanitizeText(record["@id"], 160) ?? null;
}

function normalizeTagList(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => sanitizeText(item, 120))
      .filter((item): item is string => Boolean(item));
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => sanitizeText(item, 120))
    .filter((item): item is string => Boolean(item));
}

function firstValue(value: unknown): string | null {
  if (typeof value === "string") {
    return sanitizeText(value, 120);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const cleaned = firstValue(item);

      if (cleaned) {
        return cleaned;
      }
    }
  }

  return null;
}

function readSourceUrl(recipeNode: Record<string, unknown>) {
  const mainEntityOfPage = recipeNode.mainEntityOfPage;

  if (typeof mainEntityOfPage === "string") {
    return mainEntityOfPage;
  }

  if (mainEntityOfPage && typeof mainEntityOfPage === "object" && !Array.isArray(mainEntityOfPage)) {
    const record = mainEntityOfPage as Record<string, unknown>;

    return (
      sanitizeText(record["@id"], 2000) ??
      sanitizeText(record.url, 2000) ??
      sanitizeText(record.id, 2000) ??
      null
    );
  }

  return sanitizeText(recipeNode.url, 2000) ?? null;
}

function readPublisherName(recipeNode: Record<string, unknown>): string | null {
  const publisher = recipeNode.publisher;

  if (typeof publisher === "string") {
    return sanitizeText(publisher, 160);
  }

  if (publisher && typeof publisher === "object" && !Array.isArray(publisher)) {
    const record = publisher as Record<string, unknown>;
    return sanitizeText(record.name, 160);
  }

  return null;
}

function isRecipeType(value: unknown) {
  if (typeof value === "string") {
    return value.toLowerCase() === "recipe";
  }

  if (!Array.isArray(value)) {
    return false;
  }

  return value.some((entry) => typeof entry === "string" && entry.toLowerCase() === "recipe");
}

function cleanJsonLdScriptContent(content: string): string {
  return content
    .replace(/^[\s\uFEFF\xA0]*(?:<!--)?\s*/, "")
    .replace(/\s*(?:-->)?[\s\uFEFF\xA0]*$/, "")
    .replace(/^\/\*<!\[CDATA\[\*\//, "")
    .replace(/\/\*\]\]>\*\/$/, "")
    .trim();
}

function safeJsonParse(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
