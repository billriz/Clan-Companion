import { NextResponse } from "next/server";
import { ZodError } from "zod";

import type { ImportedRecipeDraft } from "@/lib/recipes/import/types";
import { normalizeAndAssertSafeHttpUrl, UrlSafetyError } from "@/lib/recipes/import/url-safety";
import { saveImportedRecipeRequestSchema } from "@/lib/recipes/import/validation";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to save imported recipes." }, { status: 401 });
  }

  // TODO: Enforce premium access when premium billing is enabled.

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const { draft } = saveImportedRecipeRequestSchema.parse(requestBody);
    const sourceUrl = await normalizeAndAssertSafeHttpUrl(draft.sourceUrl);
    const payload = mapDraftToRecipeInsertPayload(user.id, {
      ...draft,
      sourceUrl,
    });

    const { data: insertedRecipe, error: insertError } = await supabase
      .from("recipes")
      .insert(payload)
      .select("id")
      .single();

    if (insertError || !insertedRecipe) {
      return NextResponse.json({ error: "Recipe could not be saved. Please try again." }, { status: 500 });
    }

    return NextResponse.json(
      {
        recipeId: insertedRecipe.id,
        redirectTo: `/recipes/${insertedRecipe.id}`,
      },
      { status: 201 },
    );
  } catch (error) {
    return mapSaveRouteError(error);
  }
}

function mapDraftToRecipeInsertPayload(userId: string, draft: ImportedRecipeDraft) {
  const totalTime =
    draft.totalTimeMinutes ??
    sumPositiveNumbers(draft.prepTimeMinutes ?? null, draft.cookTimeMinutes ?? null);

  const tags = dedupeStrings([
    ...draft.tags,
    draft.cuisine ?? "",
    draft.importMethod === "spoonacular" ? "Spoonacular" : "JSON-LD",
  ]);

  return {
    user_id: userId,
    title: draft.title.trim(),
    description: draft.description?.trim() || null,
    image_url: draft.imageUrl ?? null,
    external_image_url: draft.imageUrl ?? null,
    source_url: draft.sourceUrl,
    source_name: draft.sourceName ?? null,
    imported_from: draft.importMethod,
    imported_at: new Date().toISOString(),
    prep_time: draft.prepTimeMinutes ?? (draft.cookTimeMinutes ? null : totalTime),
    cook_time: draft.cookTimeMinutes ?? null,
    servings: draft.servings ?? null,
    difficulty: mapDifficultyFromTime(totalTime),
    category: draft.category ?? "Imported",
    tags,
    ingredients: draft.ingredients.map((ingredient) => ({ quantity: "", unit: "", name: ingredient })) as unknown as Json,
    instructions: draft.instructions as unknown as Json,
    nutrition: {
      importMetadata: {
        author: draft.author ?? null,
        cuisine: draft.cuisine ?? null,
        sourceName: draft.sourceName ?? null,
        sourceUrl: draft.sourceUrl,
      },
    } as unknown as Json,
  };
}

function mapSaveRouteError(error: unknown) {
  if (error instanceof UrlSafetyError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];

    return NextResponse.json(
      { error: firstIssue?.message ?? "Please review recipe details before saving." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { error: "Recipe could not be saved. Please try again." },
    { status: 500 },
  );
}

function sumPositiveNumbers(first: number | null, second: number | null) {
  const validFirst = typeof first === "number" && Number.isFinite(first) && first > 0 ? first : 0;
  const validSecond = typeof second === "number" && Number.isFinite(second) && second > 0 ? second : 0;

  const total = validFirst + validSecond;
  return total > 0 ? total : null;
}

function mapDifficultyFromTime(totalTimeMinutes: number | null) {
  if (typeof totalTimeMinutes !== "number" || !Number.isFinite(totalTimeMinutes)) {
    return "Easy";
  }

  if (totalTimeMinutes <= 30) {
    return "Easy";
  }

  if (totalTimeMinutes <= 60) {
    return "Medium";
  }

  return "Hard";
}

function dedupeStrings(values: string[]) {
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
