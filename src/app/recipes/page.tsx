import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { RecipeLibrary } from "@/components/recipes/recipe-library";
import { createClient } from "@/lib/supabase/server";
import type { Recipe } from "@/types/recipes";

export const metadata: Metadata = {
  title: "Recipes",
};

export default async function RecipesPage() {
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

  const { data: recipes, error } = recipesResponse;
  const recipesWithPreviewUrls = recipes ? await addScanImagePreviewUrls(supabase, recipes) : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 lg:max-w-5xl lg:px-8 lg:py-10">
      <PageHeader
        title="Recipes"
        description="Search, save, and organize your recipe box."
      />

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm leading-6 text-destructive shadow-subtle">
          Recipes could not be loaded. {error.message}
        </div>
      ) : (
        <RecipeLibrary recipes={recipesWithPreviewUrls} userId={user.id} />
      )}
    </div>
  );
}

async function addScanImagePreviewUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recipes: Recipe[],
) {
  const recipesWithImages = await Promise.all(
    recipes.map(async (recipe) => {
      if (recipe.image_url || !recipe.original_image_path) {
        return recipe;
      }

      const { data } = await supabase.storage
        .from("recipe-scans")
        .createSignedUrl(recipe.original_image_path, 60 * 60);

      if (!data?.signedUrl) {
        return recipe;
      }

      return {
        ...recipe,
        image_url: data.signedUrl,
      };
    }),
  );

  return recipesWithImages;
}
