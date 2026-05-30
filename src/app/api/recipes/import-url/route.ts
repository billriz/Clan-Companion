import { NextResponse } from "next/server";

import { extractRecipeFromJsonLd } from "@/lib/recipes/import/json-ld-parser";
import {
  collectMissingRequiredFields,
  getDraftCompletenessScore,
  normalizeImportedRecipeDraft,
} from "@/lib/recipes/import/normalize-recipe";
import { importUrlRequestSchema } from "@/lib/recipes/import/schemas";
import { extractRecipeWithSpoonacular } from "@/lib/recipes/import/spoonacular-url";
import type { ImportedRecipeDraft } from "@/lib/recipes/import/types";
import {
  UrlSafetyError,
  validateAndNormalizeExternalUrl,
} from "@/lib/recipes/import/url-safety";
import { createClient } from "@/lib/supabase/server";

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
    return NextResponse.json(
      { error: "That link doesn’t look valid. Try pasting the full recipe URL." },
      { status: 400 },
    );
  }

  const parsedRequest = importUrlRequestSchema.safeParse(requestBody);

  if (!parsedRequest.success) {
    return NextResponse.json(
      {
        error:
          parsedRequest.error.issues[0]?.message ??
          "That link doesn’t look valid. Try pasting the full recipe URL.",
      },
      { status: 400 },
    );
  }

  let sourceUrl: string;

  try {
    sourceUrl = validateAndNormalizeExternalUrl(parsedRequest.data.url).toString();
  } catch (error) {
    return mapImportError(error);
  }

  // TODO: Enforce premium access when premium billing is enabled.

  let spoonacularDraft: ImportedRecipeDraft | null = null;

  try {
    spoonacularDraft = await extractRecipeWithSpoonacular(sourceUrl);
  } catch {
    spoonacularDraft = null;
  }

  if (spoonacularDraft) {
    const normalized = normalizeImportedRecipeDraft({
      ...spoonacularDraft,
      sourceUrl,
      importMethod: "spoonacular",
    });

    const missingFields = collectMissingRequiredFields(normalized);

    if (missingFields.length === 0) {
      return NextResponse.json({ recipe: normalized, status: "complete" }, { status: 200 });
    }

    spoonacularDraft = normalized;
  }

  let jsonLdDraft: ImportedRecipeDraft | null = null;

  try {
    jsonLdDraft = await extractRecipeFromJsonLd(sourceUrl);
  } catch (error) {
    if (spoonacularDraft) {
      return NextResponse.json(
        {
          recipe: spoonacularDraft,
          status: "partial",
          missingFields: collectMissingRequiredFields(spoonacularDraft),
          message: "This recipe imported partially. Please review and fill in the missing details.",
        },
        { status: 200 },
      );
    }

    return mapImportError(error);
  }

  if (jsonLdDraft) {
    const normalized = normalizeImportedRecipeDraft({
      ...jsonLdDraft,
      sourceUrl,
      importMethod: "jsonld",
    });

    const missingFields = collectMissingRequiredFields(normalized);

    if (missingFields.length === 0) {
      return NextResponse.json({ recipe: normalized, status: "complete" }, { status: 200 });
    }

    jsonLdDraft = normalized;
  }

  const partialDraft = pickBestPartialDraft(spoonacularDraft, jsonLdDraft);

  if (partialDraft) {
    return NextResponse.json(
      {
        recipe: partialDraft,
        status: "partial",
        missingFields: collectMissingRequiredFields(partialDraft),
        message: "This recipe imported partially. Please review and fill in the missing details.",
      },
      { status: 200 },
    );
  }

  return NextResponse.json(
    { error: "We couldn’t find a recipe on that page." },
    { status: 422 },
  );
}

function pickBestPartialDraft(
  first: ImportedRecipeDraft | null,
  second: ImportedRecipeDraft | null,
) {
  if (!first && !second) {
    return null;
  }

  if (!first) {
    return second;
  }

  if (!second) {
    return first;
  }

  return getDraftCompletenessScore(second) > getDraftCompletenessScore(first) ? second : first;
}

function mapImportError(error: unknown) {
  if (error instanceof UrlSafetyError) {
    if (error.code === "HTTP_ERROR" || error.code === "UNSUPPORTED_CONTENT_TYPE") {
      return NextResponse.json({ error: "We couldn’t find a recipe on that page." }, { status: 422 });
    }

    return NextResponse.json({ error: error.userMessage }, { status: error.status });
  }

  return NextResponse.json(
    { error: "Couldn’t automatically import this recipe. You can still add it manually." },
    { status: 502 },
  );
}
