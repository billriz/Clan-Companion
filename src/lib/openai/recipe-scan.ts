import "server-only";

import OpenAI, { APIConnectionError, APIConnectionTimeoutError, APIError, RateLimitError } from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import {
  normalizeRecipeScanSourceType,
  recipeScanModelOutputSchema,
  recipeScanResultSchema,
  type RecipeScanResult,
  type RecipeScanSourceType,
} from "@/lib/validations/recipe-scan";

const DEFAULT_RECIPE_SCAN_MODEL = "gpt-4.1-mini";

const RECIPE_SCAN_SYSTEM_PROMPT =
  "You are a precise recipe extraction engine. You analyze images of recipe cards, cookbook snippets, printed recipes, and handwritten recipes. Extract only information visible in the image. Do not invent missing details. Return valid JSON only matching the requested schema. No markdown. No commentary.";

const RECIPE_SCAN_TEMPLATE = `Analyze this image and extract the recipe into this JSON structure:

{
  "isRecipe": true,
  "title": null,
  "description": null,
  "servings": null,
  "prepTimeMinutes": null,
  "cookTimeMinutes": null,
  "totalTimeMinutes": null,
  "ingredients": [
    {
      "originalText": "",
      "quantity": null,
      "unit": null,
      "name": null,
      "preparation": null,
      "optional": false,
      "confidence": 0
    }
  ],
  "instructions": [
    {
      "stepNumber": 1,
      "text": "",
      "confidence": 0
    }
  ],
  "notes": [],
  "tags": [],
  "cuisine": null,
  "mealType": null,
  "sourceType": "unknown",
  "confidenceScore": 0,
  "missingFields": [],
  "warnings": [],
  "rawExtractedText": ""
}

Rules:
- If the image does not appear to be a recipe, set isRecipe to false.
- If a field is not visible, use null or an empty array.
- Preserve original ingredient lines in originalText.
- Split ingredient lines into quantity, unit, name, and preparation only when reasonably clear.
- Use confidence numbers from 0 to 1.
- Add warnings for blurry text, cut-off content, illegible handwriting, missing directions, missing ingredients, or partial page.
- Keep instruction steps in the visible order.
- Do not summarize creatively.
- Do not add nutrition unless visible in the image.
- Do not infer servings, times, cuisine, or meal type unless visible or strongly indicated by the text.
- Return JSON only.`;

export type ExtractRecipeFromImageInput = {
  imageDataUrl: string;
  sourceType?: string | null;
};

export type ExtractRecipeFromImageResult = {
  extractedRecipe: RecipeScanResult;
  rawText: string;
  confidence: number;
  missingFields: string[];
  warnings: string[];
  scanModel: string;
};

export class RecipeScanExtractionError extends Error {
  code:
    | "MISSING_API_KEY"
    | "RATE_LIMIT"
    | "OPENAI_TIMEOUT"
    | "OPENAI_API"
    | "INVALID_JSON"
    | "UNKNOWN";

  status: number;

  constructor(
    code:
      | "MISSING_API_KEY"
      | "RATE_LIMIT"
      | "OPENAI_TIMEOUT"
      | "OPENAI_API"
      | "INVALID_JSON"
      | "UNKNOWN",
    message: string,
    status: number,
  ) {
    super(message);
    this.name = "RecipeScanExtractionError";
    this.code = code;
    this.status = status;
  }
}

let client: OpenAI | null = null;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new RecipeScanExtractionError(
      "MISSING_API_KEY",
      "Recipe scanning is not configured yet. Add OPENAI_API_KEY on the server.",
      500,
    );
  }

  if (!client) {
    client = new OpenAI({ apiKey });
  }

  return client;
}

function getRecipeScanModel() {
  const configuredModel = process.env.OPENAI_RECIPE_SCAN_MODEL?.trim();
  return configuredModel || DEFAULT_RECIPE_SCAN_MODEL;
}

export function buildRecipeScanPrompt(sourceType: RecipeScanSourceType) {
  return `${RECIPE_SCAN_TEMPLATE}\n\nUser-selected sourceType hint: ${sourceType}.`;
}

const recipeScanTextFormat = zodTextFormat(recipeScanModelOutputSchema, "recipe_scan_result", {
  description: "Structured recipe extraction result from a recipe image scan.",
});

export async function extractRecipeFromImage({
  imageDataUrl,
  sourceType,
}: ExtractRecipeFromImageInput): Promise<ExtractRecipeFromImageResult> {
  const openai = getClient();
  const scanModel = getRecipeScanModel();
  const normalizedSourceType = normalizeRecipeScanSourceType(sourceType ?? "unknown");

  let responseOutputText = "";

  try {
    const response = await openai.responses.create({
      model: scanModel,
      temperature: 0,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: RECIPE_SCAN_SYSTEM_PROMPT }],
        },
        {
          role: "user",
          content: [
            { type: "input_text", text: buildRecipeScanPrompt(normalizedSourceType) },
            { type: "input_image", image_url: imageDataUrl, detail: "high" },
          ],
        },
      ],
      text: {
        format: recipeScanTextFormat,
      },
    });

    responseOutputText = (response.output_text ?? "").trim();

    const parsed = parseRecipeScanResponse(responseOutputText);
    const normalized = normalizeScanResult(parsed, normalizedSourceType);

    return {
      extractedRecipe: normalized,
      rawText: normalized.rawExtractedText,
      confidence: normalized.confidenceScore,
      missingFields: normalized.missingFields,
      warnings: normalized.warnings,
      scanModel,
    };
  } catch (error) {
    const repaired = await repairInvalidJsonIfNeeded(
      {
        model: scanModel,
        normalizedSourceType,
        rawModelOutput: responseOutputText,
      },
      error,
    );

    if (repaired) {
      return {
        extractedRecipe: repaired,
        rawText: repaired.rawExtractedText,
        confidence: repaired.confidenceScore,
        missingFields: repaired.missingFields,
        warnings: repaired.warnings,
        scanModel,
      };
    }

    throw mapOpenAIError(error);
  }
}

export function parseRecipeScanResponse(rawText: string): RecipeScanResult {
  const parsed = JSON.parse(rawText);
  const strictParsed = recipeScanModelOutputSchema.parse(parsed);
  return recipeScanResultSchema.parse(strictParsed);
}

type RepairAttemptInput = {
  model: string;
  normalizedSourceType: RecipeScanSourceType;
  rawModelOutput: string;
};

export async function repairInvalidJsonIfNeeded(
  repairInput: RepairAttemptInput,
  originalError: unknown,
): Promise<RecipeScanResult | null> {
  if (!repairInput.rawModelOutput) {
    return null;
  }

  const openai = getClient();

  try {
    const repairResponse = await openai.responses.create({
      model: repairInput.model,
      temperature: 0,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `${RECIPE_SCAN_SYSTEM_PROMPT} Convert malformed JSON to valid JSON that matches the schema exactly.`,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Rewrite this invalid JSON into valid JSON that matches the schema exactly. Return JSON only.\n\n" +
                repairInput.rawModelOutput,
            },
          ],
        },
      ],
      text: {
        format: recipeScanTextFormat,
      },
    });

    const repairedText = (repairResponse.output_text ?? "").trim();

    if (!repairedText) {
      return null;
    }

    const repairedResult = parseRecipeScanResponse(repairedText);
    return normalizeScanResult(repairedResult, repairInput.normalizedSourceType);
  } catch {
    if (isInvalidJsonError(originalError)) {
      throw new RecipeScanExtractionError(
        "INVALID_JSON",
        "We had trouble reading that recipe. Try cropping the image and scanning again.",
        422,
      );
    }

    return null;
  }
}

export function normalizeScanResult(
  result: RecipeScanResult,
  sourceType: RecipeScanSourceType,
): RecipeScanResult {
  const cleanedIngredients = result.ingredients
    .map((ingredient) => ({
      ...ingredient,
      originalText: ingredient.originalText.trim(),
      quantity: ingredient.quantity?.trim() ?? null,
      unit: ingredient.unit?.trim() ?? null,
      name: ingredient.name?.trim() ?? null,
      preparation: ingredient.preparation?.trim() ?? null,
      confidence: clampConfidence(ingredient.confidence),
    }))
    .filter((ingredient) => {
      return Boolean(
        ingredient.originalText || ingredient.name || ingredient.quantity || ingredient.unit,
      );
    });

  const cleanedInstructions = result.instructions
    .map((instruction) => ({
      ...instruction,
      text: instruction.text.trim(),
      confidence: clampConfidence(instruction.confidence),
    }))
    .filter((instruction) => instruction.text.length > 0)
    .sort((first, second) => first.stepNumber - second.stepNumber)
    .map((instruction, index) => ({
      ...instruction,
      stepNumber: index + 1,
    }));

  const normalizedNotes = dedupeTrimmed(result.notes);
  const normalizedTags = dedupeTrimmed(result.tags);
  const normalizedMissingFields = dedupeTrimmed(result.missingFields);
  const normalizedWarnings = dedupeTrimmed(result.warnings);

  const normalized: RecipeScanResult = {
    isRecipe: result.isRecipe,
    title: normalizeNullableText(result.title),
    description: normalizeNullableText(result.description),
    servings: normalizeServings(result.servings),
    prepTimeMinutes: normalizeMinutes(result.prepTimeMinutes),
    cookTimeMinutes: normalizeMinutes(result.cookTimeMinutes),
    totalTimeMinutes: normalizeMinutes(result.totalTimeMinutes),
    ingredients: cleanedIngredients,
    instructions: cleanedInstructions,
    notes: normalizedNotes,
    tags: normalizedTags,
    cuisine: normalizeNullableText(result.cuisine),
    mealType: normalizeNullableText(result.mealType),
    sourceType: result.sourceType === "unknown" ? sourceType : result.sourceType,
    confidenceScore: clampConfidence(result.confidenceScore),
    missingFields: normalizedMissingFields,
    warnings: normalizedWarnings,
    rawExtractedText: result.rawExtractedText.trim(),
  };

  if (!normalized.title) {
    normalized.missingFields = dedupeTrimmed([...normalized.missingFields, "title"]);
    normalized.warnings = dedupeTrimmed([
      ...normalized.warnings,
      "Title could not be confidently read from the image.",
    ]);
  }

  if (normalized.ingredients.length === 0) {
    normalized.missingFields = dedupeTrimmed([...normalized.missingFields, "ingredients"]);
    normalized.warnings = dedupeTrimmed([
      ...normalized.warnings,
      "No ingredients were detected. The image may be blurry or cropped.",
    ]);
  }

  if (normalized.instructions.length === 0) {
    normalized.missingFields = dedupeTrimmed([...normalized.missingFields, "instructions"]);
    normalized.warnings = dedupeTrimmed([
      ...normalized.warnings,
      "No instructions were detected. The image may be partial or hard to read.",
    ]);
  }

  if (normalized.confidenceScore < 0.6) {
    normalized.warnings = dedupeTrimmed([
      ...normalized.warnings,
      "Low confidence extraction. Please review carefully before saving.",
    ]);
  }

  if (!normalized.isRecipe) {
    normalized.warnings = dedupeTrimmed([
      ...normalized.warnings,
      "This image may not contain a complete recipe.",
    ]);
  }

  return normalized;
}

function normalizeNullableText(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeMinutes(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded >= 0 ? rounded : null;
}

function normalizeServings(value: string | number | null) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  return null;
}

function dedupeTrimmed(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function clampConfidence(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return Number(value.toFixed(2));
}

function isInvalidJsonError(error: unknown) {
  if (error instanceof SyntaxError) {
    return true;
  }

  if (error instanceof RecipeScanExtractionError && error.code === "INVALID_JSON") {
    return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("json") || message.includes("schema");
}

function mapOpenAIError(error: unknown): RecipeScanExtractionError {
  if (error instanceof RecipeScanExtractionError) {
    return error;
  }

  if (error instanceof RateLimitError) {
    return new RecipeScanExtractionError(
      "RATE_LIMIT",
      "Recipe scan is temporarily busy. Please try again in a minute.",
      429,
    );
  }

  if (error instanceof APIConnectionTimeoutError || error instanceof APIConnectionError) {
    return new RecipeScanExtractionError(
      "OPENAI_TIMEOUT",
      "Recipe scan timed out. Please try a clearer image or try again.",
      502,
    );
  }

  if (error instanceof APIError) {
    const status = error.status ?? 502;

    if (status === 429) {
      return new RecipeScanExtractionError(
        "RATE_LIMIT",
        "Recipe scan is temporarily busy. Please try again in a minute.",
        429,
      );
    }

    return new RecipeScanExtractionError(
      "OPENAI_API",
      "We couldn't read that recipe clearly. Try taking the photo in better light and make sure the full recipe is visible.",
      status >= 400 && status < 600 ? status : 502,
    );
  }

  if (isInvalidJsonError(error)) {
    return new RecipeScanExtractionError(
      "INVALID_JSON",
      "We had trouble reading that recipe. Try cropping the image and scanning again.",
      422,
    );
  }

  return new RecipeScanExtractionError(
    "UNKNOWN",
    "We couldn't read that recipe clearly. Try taking the photo in better light and make sure the full recipe is visible.",
    502,
  );
}
