import { NextResponse } from "next/server";

import { searchSpoonacularRecipes, SpoonacularError } from "@/lib/spoonacular";
import { createClient } from "@/lib/supabase/server";
import type { SpoonacularSearchParams } from "@/types/spoonacular";

const MAX_QUERY_LENGTH = 120;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to browse recipes." }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;

  const query = searchParams.get("query")?.trim() ?? "";
  const cuisine = searchParams.get("cuisine")?.trim() ?? "";
  const diet = searchParams.get("diet")?.trim() ?? "";
  const intolerances = searchParams.get("intolerances")?.trim() ?? "";

  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Search query is too long. Use ${MAX_QUERY_LENGTH} characters or less.` },
      { status: 400 },
    );
  }

  const maxReadyTimeValue = searchParams.get("maxReadyTime");
  let maxReadyTime: number | undefined;

  if (maxReadyTimeValue) {
    const parsedMaxReadyTime = parsePositiveInteger(maxReadyTimeValue);

    if (parsedMaxReadyTime === null) {
      return NextResponse.json(
        { error: "Max ready time must be a positive number." },
        { status: 400 },
      );
    }

    maxReadyTime = parsedMaxReadyTime;
  }

  const requestedNumber = parsePositiveInteger(searchParams.get("number") ?? "");
  const number = requestedNumber === null ? 12 : Math.min(24, Math.max(1, requestedNumber));

  const parsedParams: SpoonacularSearchParams = {
    query: query || undefined,
    cuisine: cuisine || undefined,
    diet: diet || undefined,
    intolerances: intolerances || undefined,
    maxReadyTime,
    number,
  };

  try {
    const response = await searchSpoonacularRecipes(parsedParams);

    return NextResponse.json(
      {
        results: response.results,
        totalResults: response.totalResults,
      },
      { status: 200 },
    );
  } catch (error) {
    return mapRouteError(error);
  }
}

function mapRouteError(error: unknown) {
  if (error instanceof SpoonacularError) {
    if (error.code === "MISSING_API_KEY") {
      return NextResponse.json(
        {
          error:
            "Recipe browsing is not configured yet. Ask an admin to add SPOONACULAR_API_KEY.",
        },
        { status: 500 },
      );
    }

    if (error.code === "RATE_LIMIT") {
      return NextResponse.json(
        { error: "Recipe search is temporarily busy. Please try again in a minute." },
        { status: 429 },
      );
    }

    if (error.code === "AUTH") {
      return NextResponse.json(
        { error: "Recipe search service is unavailable right now." },
        { status: 502 },
      );
    }

    if (error.code === "BAD_RESPONSE") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Recipe search failed. Please try again shortly." },
      { status: error.status >= 400 && error.status < 600 ? error.status : 500 },
    );
  }

  return NextResponse.json({ error: "Unexpected error while searching recipes." }, { status: 500 });
}

function parsePositiveInteger(value: string) {
  if (!/^\d+$/.test(value.trim())) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}
