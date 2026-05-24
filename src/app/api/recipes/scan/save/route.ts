import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { recipeScanSavePayloadSchema } from "@/lib/validations/recipe-scan";
import type { Json } from "@/types/supabase";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to save scanned recipes." }, { status: 401 });
  }

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsedPayload = recipeScanSavePayloadSchema.safeParse(requestBody);

  if (!parsedPayload.success) {
    const firstIssue = parsedPayload.error.issues[0];

    return NextResponse.json(
      {
        error: firstIssue?.message ?? "Recipe details are incomplete. Please review and try again.",
      },
      { status: 400 },
    );
  }

  const payload = parsedPayload.data;

  const cleanedIngredients = payload.ingredients
    .map((ingredient) => ({
      quantity: sanitizeText(ingredient.quantity) ?? "",
      unit: sanitizeText(ingredient.unit) ?? "",
      name: sanitizeText(ingredient.name) ?? "",
      originalText: sanitizeText(ingredient.originalText) ?? "",
      preparation: sanitizeText(ingredient.preparation),
      optional: Boolean(ingredient.optional),
      confidence: clampConfidence(ingredient.confidence),
    }))
    .filter((ingredient) => ingredient.quantity || ingredient.unit || ingredient.name || ingredient.originalText);

  const cleanedInstructions = payload.instructions
    .map((instruction) => sanitizeText(instruction.text) ?? "")
    .filter(Boolean);

  const cleanedTags = dedupeStrings([
    ...payload.tags,
    payload.cuisine ?? "",
    payload.mealType ?? "",
  ]);

  const extractionNotes = {
    warnings: payload.warnings,
    missingFields: payload.missingFields,
    notes: payload.notes,
    cuisine: payload.cuisine,
    mealType: payload.mealType,
    instructionsWithConfidence: payload.instructions.map((instruction) => ({
      stepNumber: instruction.stepNumber,
      text: sanitizeText(instruction.text) ?? "",
      confidence: clampConfidence(instruction.confidence),
    })),
    ingredientsWithConfidence: cleanedIngredients,
    savedAt: new Date().toISOString(),
  };

  const insertPayload = {
    user_id: user.id,
    title: sanitizeText(payload.title) ?? payload.title.trim(),
    description: sanitizeText(payload.description),
    image_url: null,
    prep_time: normalizeMinutes(payload.prepTimeMinutes),
    cook_time: normalizeMinutes(payload.cookTimeMinutes),
    servings: normalizeServings(payload.servings),
    difficulty: "Easy",
    category: sanitizeText(payload.mealType) ?? sanitizeText(payload.cuisine),
    tags: cleanedTags,
    ingredients: cleanedIngredients as unknown as Json,
    instructions: cleanedInstructions as unknown as Json,
    import_source: "vision_scan",
    imported_from: "openai_vision",
    original_image_url: payload.originalImageUrl,
    original_image_path: payload.originalImagePath,
    extraction_confidence: clampConfidence(payload.confidenceScore),
    raw_extracted_text: sanitizeText(payload.rawExtractedText),
    extraction_notes: extractionNotes as unknown as Json,
    source_type: payload.sourceType,
    scan_model: payload.scanModel || process.env.OPENAI_RECIPE_SCAN_MODEL || "gpt-4.1-mini",
  };

  const { data: savedRecipe, error: insertError } = await supabase
    .from("recipes")
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json(
      {
        error: "Recipe could not be saved. Please try again.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ recipe: savedRecipe }, { status: 201 });
}

function sanitizeText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const withoutHtml = value.replace(/<[^>]*>/g, " ");
  const squashed = withoutHtml.replace(/\s+/g, " ").trim();
  return squashed.length > 0 ? squashed : null;
}

function dedupeStrings(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeServings(value: string | number | null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value);
    return rounded > 0 ? rounded : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const digits = value.match(/\d+/)?.[0];

  if (!digits) {
    return null;
  }

  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeMinutes(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return rounded >= 0 ? rounded : null;
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
