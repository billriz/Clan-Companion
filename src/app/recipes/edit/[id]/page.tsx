import type { Metadata } from "next";

import { RecipeForm } from "@/components/recipes/recipe-form";
import { RecipeNotFound } from "@/components/recipes/recipe-not-found";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Edit Recipe",
};

type EditRecipePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!recipe) {
    return <RecipeNotFound />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <RecipeForm mode="edit" recipe={recipe} />
    </div>
  );
}
