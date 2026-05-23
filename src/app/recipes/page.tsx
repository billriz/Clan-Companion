import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Plus } from "lucide-react";

import { RecipeLibrary } from "@/components/recipes/recipe-library";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

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

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="blue">Recipe library</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-plate-charcoal sm:text-4xl">
            My Recipes
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Keep favorites, quick dinners, and family staples in a calm library built for scanning.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className={cn(buttonVariants({ variant: "secondary" }), "gap-2")}
            href="/recipes/import"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Import Recipes
          </Link>
          <Link className={cn(buttonVariants(), "gap-2")} href="/recipes/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Recipe
          </Link>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm leading-6 text-destructive shadow-subtle">
          Recipes could not be loaded. {error.message}
        </div>
      ) : (
        <RecipeLibrary recipes={recipes ?? []} userId={user.id} />
      )}
    </div>
  );
}
