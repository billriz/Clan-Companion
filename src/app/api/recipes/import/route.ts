import { NextResponse } from "next/server";

import {
  getSpoonacularRecipeInformation,
  normalizeRecipeDetails,
  SpoonacularError,
} from "@/lib/spoonacular";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/supabase";

type ImportRequestBody = {
  spoonacularId?: number | string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to import recipes." }, { status: 401 });
  }

  let requestBody: ImportRequestBody;

  try {
    requestBody = (await request.json()) as ImportRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const spoonacularId = parsePositiveInteger(requestBody.spoonacularId);

  if (spoonacularId === null) {
    return NextResponse.json({ error: "spoonacularId must be a positive integer." }, { status: 400 });
  }

  const existingRecipe = await getExistingImportedRecipe(supabase, user.id, spoonacularId);

  if (existingRecipe) {
    return NextResponse.json(
      {
        message: "Recipe already imported",
        alreadyImported: true,
        recipe: existingRecipe,
      },
      { status: 200 },
    );
  }

  try {
    const spoonacularRecipe = await getSpoonacularRecipeInformation(spoonacularId);
    const normalizedRecipe = normalizeRecipeDetails(spoonacularRecipe);

    const insertPayload: Database["public"]["Tables"]["recipes"]["Insert"] = {
      user_id: user.id,
      title: normalizedRecipe.title,
      description: normalizedRecipe.description,
      image_url: normalizedRecipe.image_url,
      prep_time: normalizedRecipe.prep_time,
      cook_time: normalizedRecipe.cook_time,
      servings: normalizedRecipe.servings,
      difficulty: normalizedRecipe.difficulty,
      category: normalizedRecipe.category,
      tags: normalizedRecipe.tags,
      ingredients: normalizedRecipe.ingredients as unknown as Json,
      instructions: normalizedRecipe.instructions as unknown as Json,
      source_url: normalizedRecipe.source_url,
      spoonacular_id: normalizedRecipe.spoonacular_id,
      imported_from: normalizedRecipe.imported_from,
      nutrition: normalizedRecipe.nutrition as unknown as Json,
    };

    const { data: insertedRecipe, error: insertError } = await supabase
      .from("recipes")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError) {
      if (isDuplicateError(insertError.code)) {
        const duplicateRecipe = await getExistingImportedRecipe(supabase, user.id, spoonacularId);

        if (duplicateRecipe) {
          return NextResponse.json(
            {
              message: "Recipe already imported",
              alreadyImported: true,
              recipe: duplicateRecipe,
            },
            { status: 200 },
          );
        }
      }

      return NextResponse.json({ error: "Recipe could not be saved." }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: "Recipe imported successfully",
        alreadyImported: false,
        recipe: insertedRecipe,
      },
      { status: 201 },
    );
  } catch (error) {
    return mapRouteError(error);
  }
}

async function getExistingImportedRecipe(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  spoonacularId: number,
) {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", userId)
    .eq("spoonacular_id", spoonacularId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

function isDuplicateError(code: string | undefined) {
  return code === "23505";
}

function parsePositiveInteger(value: number | string | undefined) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function mapRouteError(error: unknown) {
  if (error instanceof SpoonacularError) {
    if (error.code === "MISSING_API_KEY") {
      return NextResponse.json(
        {
          error:
            "Recipe import is not configured yet. Ask an admin to add SPOONACULAR_API_KEY.",
        },
        { status: 500 },
      );
    }

    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: "That recipe is no longer available to import." }, { status: 404 });
    }

    if (error.code === "RATE_LIMIT") {
      return NextResponse.json(
        { error: "Recipe import is temporarily busy. Please try again in a minute." },
        { status: 429 },
      );
    }

    if (error.code === "AUTH") {
      return NextResponse.json(
        { error: "Recipe import service is unavailable right now." },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: "Recipe import failed. Please try again shortly." },
      { status: error.status >= 400 && error.status < 600 ? error.status : 500 },
    );
  }

  return NextResponse.json({ error: "Unexpected error while importing recipe." }, { status: 500 });
}
