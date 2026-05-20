/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Clock3,
  CookingPot,
  ListChecks,
  Signal,
  Timer,
  UsersRound,
} from "lucide-react";

import { RecipeDetailActions } from "@/components/recipes/recipe-detail-actions";
import { RecipeImagePlaceholder } from "@/components/recipes/recipe-image-placeholder";
import { RecipeNotFound } from "@/components/recipes/recipe-not-found";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  formatMinutes,
  getTotalTime,
  normalizeDifficulty,
  parseIngredients,
  parseInstructions,
} from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
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

  const ingredients = parseIngredients(recipe.ingredients);
  const instructions = parseInstructions(recipe.instructions);
  const totalTime = getTotalTime(recipe);
  const difficulty = normalizeDifficulty(recipe.difficulty);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <Link className={cn(buttonVariants({ variant: "secondary" }), "mb-6 gap-2")} href="/recipes">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to recipes
      </Link>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:items-start">
        <div className="aspect-video overflow-hidden rounded-2xl border bg-secondary shadow-subtle">
          {recipe.image_url ? (
            <img src={recipe.image_url} alt={recipe.title} className="h-full w-full object-cover" />
          ) : (
            <RecipeImagePlaceholder iconClassName="h-16 w-16" />
          )}
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-6">
          <div className="flex flex-wrap gap-2">
            {recipe.category ? <Badge variant="blue">{recipe.category}</Badge> : null}
            <Badge variant={difficulty === "Hard" ? "terracotta" : "default"}>{difficulty}</Badge>
            {(recipe.tags ?? []).slice(0, 3).map((tag) => (
              <Badge key={tag} variant="neutral">
                {tag}
              </Badge>
            ))}
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-normal text-plate-charcoal sm:text-4xl">
            {recipe.title}
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            {recipe.description || "No description added yet."}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <RecipeMeta icon={Timer} label="Prep" value={formatMinutes(recipe.prep_time)} />
            <RecipeMeta icon={CookingPot} label="Cook" value={formatMinutes(recipe.cook_time)} />
            <RecipeMeta icon={Clock3} label="Total" value={formatMinutes(totalTime)} />
            <RecipeMeta
              icon={UsersRound}
              label="Servings"
              value={recipe.servings ? String(recipe.servings) : "Flexible"}
            />
            <RecipeMeta icon={Signal} label="Difficulty" value={difficulty} />
            <RecipeMeta icon={ListChecks} label="Steps" value={String(instructions.length || 0)} />
          </div>

          <div className="mt-6 border-t pt-5">
            <RecipeDetailActions recipeId={recipe.id} />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-6">
          <h2 className="text-xl font-semibold text-plate-charcoal">Ingredients</h2>
          {ingredients.length > 0 ? (
            <ul className="mt-5 space-y-3">
              {ingredients.map((ingredient, index) => (
                <li
                  key={`${ingredient.name}-${index}`}
                  className="flex gap-3 rounded-xl bg-plate-paper px-4 py-3 text-sm text-plate-charcoal"
                >
                  <span className="min-w-20 font-semibold text-primary">
                    {[ingredient.quantity, ingredient.unit].filter(Boolean).join(" ") || "-"}
                  </span>
                  <span>{ingredient.name || "Ingredient"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              No ingredients have been added yet.
            </p>
          )}
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-6">
          <h2 className="text-xl font-semibold text-plate-charcoal">Instructions</h2>
          {instructions.length > 0 ? (
            <ol className="mt-5 space-y-4">
              {instructions.map((instruction, index) => (
                <li key={`${instruction}-${index}`} className="grid grid-cols-[40px_minmax(0,1fr)] gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <p className="pt-2 text-sm leading-6 text-plate-charcoal">{instruction}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              No instructions have been added yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

type RecipeMetaProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

function RecipeMeta({ icon: Icon, label, value }: RecipeMetaProps) {
  return (
    <div className="rounded-xl border bg-plate-paper p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" aria-hidden={true} />
        {label}
      </div>
      <p className="mt-2 font-semibold text-plate-charcoal">{value}</p>
    </div>
  );
}
