import { NextResponse } from "next/server";

import { PantryRecipeSearchInputError } from "@/lib/pantry-recipe-search";
import { searchRecipesFromPantry, SpoonacularError } from "@/lib/spoonacular";
import { createClient } from "@/lib/supabase/server";
import type { SpoonacularPantryRecipeSearchParams } from "@/types/spoonacular";

type PantryRecipeSearchBody = {
  ingredientNames?: unknown;
  ingredientItems?: unknown;
  number?: unknown;
  ranking?: unknown;
  ignorePantry?: unknown;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to search recipes from your pantry." },
      { status: 401 },
    );
  }

  let requestBody: PantryRecipeSearchBody;

  try {
    requestBody = (await request.json()) as PantryRecipeSearchBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const ingredientNames =
    Array.isArray(requestBody.ingredientNames) && requestBody.ingredientNames.length > 0
      ? requestBody.ingredientNames.filter((value): value is string => typeof value === "string")
      : [];

  const ingredientItems = Array.isArray(requestBody.ingredientItems)
    ? requestBody.ingredientItems
        .map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            return null;
          }

          const record = item as Record<string, unknown>;

          if (typeof record.name !== "string") {
            return null;
          }

          return {
            name: record.name,
            category: typeof record.category === "string" ? record.category : null,
          };
        })
        .filter((item): item is { name: string; category: string | null } => Boolean(item))
    : undefined;

  const params: SpoonacularPantryRecipeSearchParams = {
    ingredientNames,
    ingredientItems,
    number: parseOptionalNumeric(requestBody.number),
    ranking: parseOptionalNumeric(requestBody.ranking),
    ignorePantry:
      typeof requestBody.ignorePantry === "boolean" ? requestBody.ignorePantry : undefined,
  };

  try {
    const results = await searchRecipesFromPantry(params);
    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    return mapRouteError(error);
  }
}

function parseOptionalNumeric(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return value;
  }

  return undefined;
}

function mapRouteError(error: unknown) {
  if (error instanceof PantryRecipeSearchInputError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof SpoonacularError) {
    if (error.code === "MISSING_API_KEY") {
      console.error(
        "Pantry recipe search is missing SPOONACULAR_API_KEY on the server.",
        error,
      );

      return NextResponse.json(
        { error: "Recipe search is temporarily unavailable. Please try again later." },
        { status: 500 },
      );
    }

    if (error.code === "RATE_LIMIT") {
      return NextResponse.json(
        { error: "Recipe search is temporarily unavailable. Please try again later." },
        { status: 429 },
      );
    }

    if (error.code === "NETWORK" || error.code === "AUTH" || error.code === "UNKNOWN") {
      return NextResponse.json(
        { error: "Recipe search is temporarily unavailable. Please try again later." },
        { status: 502 },
      );
    }

    if (error.code === "BAD_RESPONSE") {
      return NextResponse.json(
        { error: "Recipe search returned invalid data. Please try again later." },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    { error: "Recipe search is temporarily unavailable. Please try again later." },
    { status: 500 },
  );
}
