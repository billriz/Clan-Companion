import type { Metadata } from "next";

import { RecipeForm } from "@/components/recipes/recipe-form";

export const metadata: Metadata = {
  title: "Create Recipe",
};

export default function NewRecipePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <RecipeForm mode="create" />
    </div>
  );
}
