import { redirect } from "next/navigation";

import { RecipeSearchResults } from "@/components/recipes/recipe-search-results";
import { createClient } from "@/lib/supabase/server";
import type { Recipe } from "@/types/recipes";

type RecipeSearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function RecipeSearchPage({ searchParams }: RecipeSearchPageProps) {
  const { q = "" } = await searchParams;
  const supabase = await createClient();
  const [userResponse, recipesResponse] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("recipes").select("*").order("updated_at", { ascending: false }),
  ]);

  const {
    data: { user },
  } = userResponse;

  if (!user) {
    redirect("/login");
  }

  if (recipesResponse.error) {
    throw new Error(recipesResponse.error.message);
  }

  return (
    <RecipeSearchResults
      initialQuery={q}
      recipes={(recipesResponse.data ?? []) as Recipe[]}
    />
  );
}
