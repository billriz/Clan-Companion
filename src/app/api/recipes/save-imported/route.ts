import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

import { saveImportedRecipeRequestSchema } from "@/lib/recipes/import/schemas";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/supabase";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You’ll need to sign in before importing recipes." }, { status: 401 });
  }

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsedPayload = saveImportedRecipeRequestSchema.safeParse(requestBody);

  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        error:
          parsedPayload.error.issues[0]?.message ??
          "Recipe details are incomplete. Please review and try again.",
      },
      { status: 400 },
    );
  }

  const payload = parsedPayload.data;

  const cleanedIngredients = payload.ingredients.map((ingredient) => ({
    quantity: "",
    unit: "",
    name: ingredient,
  }));

  const insertPayload: Database["public"]["Tables"]["recipes"]["Insert"] = {
    user_id: user.id,
    title: payload.title,
    description: payload.description,
    image_url: payload.imageUrl,
    external_image_url: payload.imageUrl,
    prep_time: payload.prepTimeMinutes,
    cook_time: payload.cookTimeMinutes,
    servings: payload.servings,
    difficulty: "Easy",
    category: payload.category ?? payload.cuisine,
    tags: payload.tags,
    ingredients: cleanedIngredients as unknown as Json,
    instructions: payload.instructions as unknown as Json,
    source_url: payload.sourceUrl,
    source_name: payload.sourceName,
    import_source: "url_import",
    imported_from: payload.importMethod,
    imported_at: new Date().toISOString(),
    extraction_notes: {
      importMethod: payload.importMethod,
      author: payload.author,
      cuisine: payload.cuisine,
      notes: payload.notes,
      savedAt: new Date().toISOString(),
    } as unknown as Json,
  };

  const { data: savedRecipe, error: insertError } = await insertRecipeWithFallbackColumns(
    supabase,
    insertPayload,
  );

  if (insertError || !savedRecipe) {
    return NextResponse.json(
      {
        error: insertError?.message ?? "Recipe could not be saved. Please try again.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ recipe: savedRecipe }, { status: 201 });
}

const FALLBACK_COLUMN_NAMES = ["external_image_url", "source_name", "imported_at"] as const;

async function insertRecipeWithFallbackColumns(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: Database["public"]["Tables"]["recipes"]["Insert"],
) {
  const candidatePayload: Record<string, unknown> = { ...payload };
  let lastError: PostgrestError | null = null;

  for (let attempt = 0; attempt <= FALLBACK_COLUMN_NAMES.length; attempt += 1) {
    const { data, error } = await supabase
      .from("recipes")
      .insert(candidatePayload as Database["public"]["Tables"]["recipes"]["Insert"])
      .select("id")
      .single();

    if (!error) {
      return { data, error: null };
    }

    lastError = error;

    const unsupportedColumn = readUnsupportedColumnName(error.message);

    if (!unsupportedColumn || !FALLBACK_COLUMN_NAMES.includes(unsupportedColumn as (typeof FALLBACK_COLUMN_NAMES)[number])) {
      break;
    }

    if (!(unsupportedColumn in candidatePayload)) {
      break;
    }

    delete candidatePayload[unsupportedColumn];
  }

  return { data: null, error: lastError };
}

function readUnsupportedColumnName(message: string | undefined) {
  if (!message) {
    return null;
  }

  const match = message.match(/Could not find the '([^']+)' column of '[^']+' in the schema cache/i);
  return match?.[1] ?? null;
}
