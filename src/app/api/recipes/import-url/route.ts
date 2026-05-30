import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { extractRecipeFromJsonLd } from "@/lib/recipes/import/jsonld-parser";
import {
  getMissingRequiredFieldLabels,
  hasRequiredRecipeFields,
} from "@/lib/recipes/import/normalize-recipe";
import {
  extractRecipeWithSpoonacularUrl,
  SpoonacularUrlExtractionError,
} from "@/lib/recipes/import/spoonacular-url";
import type { ImportedRecipeDraft } from "@/lib/recipes/import/types";
import { normalizeAndAssertSafeHttpUrl, UrlSafetyError } from "@/lib/recipes/import/url-safety";
import { importUrlRequestSchema } from "@/lib/recipes/import/validation";
import { RecipePageFetchError } from "@/lib/recipes/import/fetch-html";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to import recipes." }, { status: 401 });
  }

  // TODO: Enforce premium access when premium billing is enabled.

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const { url } = importUrlRequestSchema.parse(requestBody);
    const normalizedUrl = await normalizeAndAssertSafeHttpUrl(url);

    let spoonacularDraft: ImportedRecipeDraft | null = null;
    let spoonacularError: SpoonacularUrlExtractionError | null = null;

    try {
      spoonacularDraft = await extractRecipeWithSpoonacularUrl(normalizedUrl);
    } catch (error) {
      if (error instanceof SpoonacularUrlExtractionError) {
        spoonacularError = error;
      }

      spoonacularDraft = null;
    }

    if (spoonacularDraft && hasRequiredRecipeFields(spoonacularDraft)) {
      return NextResponse.json(
        {
          draft: spoonacularDraft,
          importMethod: "spoonacular",
        },
        { status: 200 },
      );
    }

    let jsonLdDraft: ImportedRecipeDraft | null = null;

    try {
      jsonLdDraft = await extractRecipeFromJsonLd(normalizedUrl);
    } catch (error) {
      if (spoonacularDraft) {
        const missingFields = getMissingRequiredFieldLabels(spoonacularDraft);

        return NextResponse.json(
          {
            draft: spoonacularDraft,
            importMethod: "spoonacular",
            warning:
              missingFields.length > 0
                ? `This recipe imported partially. Please add ${missingFields.join(", ")} before saving.`
                : undefined,
          },
          { status: 200 },
        );
      }

      if (spoonacularError?.code === "RATE_LIMIT") {
        return NextResponse.json(
          { error: "Recipe import is temporarily busy. Please try again in a minute." },
          { status: 429 },
        );
      }

      if (spoonacularError?.code === "TIMEOUT") {
        return NextResponse.json({ error: "Import is taking too long. Please try again." }, { status: 504 });
      }

      throw error;
    }

    const bestDraft = pickBestDraft(spoonacularDraft, jsonLdDraft);

    if (!bestDraft) {
      if (spoonacularError?.code === "RATE_LIMIT") {
        return NextResponse.json(
          { error: "Recipe import is temporarily busy. Please try again in a minute." },
          { status: 429 },
        );
      }

      return NextResponse.json(
        {
          error:
            "Couldn't automatically import this recipe. You can still add it manually.",
        },
        { status: 422 },
      );
    }

    const missingFields = getMissingRequiredFieldLabels(bestDraft);

    return NextResponse.json(
      {
        draft: bestDraft,
        importMethod: bestDraft.importMethod,
        warning:
          missingFields.length > 0
            ? `This recipe imported partially. Please add ${missingFields.join(", ")} before saving.`
            : undefined,
      },
      { status: 200 },
    );
  } catch (error) {
    return mapImportRouteError(error);
  }
}

function pickBestDraft(
  spoonacularDraft: ImportedRecipeDraft | null,
  jsonLdDraft: ImportedRecipeDraft | null,
) {
  if (!spoonacularDraft && !jsonLdDraft) {
    return null;
  }

  if (spoonacularDraft && !jsonLdDraft) {
    return hasAnyRecipeContent(spoonacularDraft) ? spoonacularDraft : null;
  }

  if (jsonLdDraft && !spoonacularDraft) {
    return hasAnyRecipeContent(jsonLdDraft) ? jsonLdDraft : null;
  }

  const spoonacularScore = scoreDraft(spoonacularDraft as ImportedRecipeDraft);
  const jsonLdScore = scoreDraft(jsonLdDraft as ImportedRecipeDraft);

  const candidate = jsonLdScore > spoonacularScore ? jsonLdDraft : spoonacularDraft;

  return candidate && hasAnyRecipeContent(candidate) ? candidate : null;
}

function scoreDraft(draft: ImportedRecipeDraft) {
  let score = 0;

  if (draft.title.trim()) {
    score += 6;
  }

  if (draft.ingredients.length > 0) {
    score += Math.min(draft.ingredients.length, 30);
  }

  if (draft.instructions.length > 0) {
    score += Math.min(draft.instructions.length, 30);
  }

  if (draft.description?.trim()) {
    score += 3;
  }

  if (draft.imageUrl) {
    score += 2;
  }

  return score;
}

function hasAnyRecipeContent(draft: ImportedRecipeDraft) {
  return Boolean(
    draft.title.trim() ||
      draft.description?.trim() ||
      draft.ingredients.length > 0 ||
      draft.instructions.length > 0,
  );
}

function mapImportRouteError(error: unknown) {
  if (error instanceof UrlSafetyError) {
    const status = error.code === "UNSAFE_URL" ? 400 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json({ error: "That link doesn't look valid. Try pasting the full recipe URL." }, { status: 400 });
  }

  if (error instanceof RecipePageFetchError) {
    if (error.code === "TIMEOUT") {
      return NextResponse.json({ error: "Import is taking too long. Please try again." }, { status: 504 });
    }

    if (error.code === "TOO_LARGE") {
      return NextResponse.json(
        { error: "That recipe page is too large to import automatically." },
        { status: 413 },
      );
    }

    return NextResponse.json(
      { error: "We couldn't find a recipe on that page." },
      { status: 422 },
    );
  }

  return NextResponse.json(
    { error: "Recipe import failed. Please try again shortly." },
    { status: 500 },
  );
}
