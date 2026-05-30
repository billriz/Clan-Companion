import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock3, ExternalLink, Heart, Signal, Timer, UsersRound } from "lucide-react";

import { RecipeDetailActions } from "@/components/recipes/recipe-detail-actions";
import { RecipeImagePlaceholder } from "@/components/recipes/recipe-image-placeholder";
import { RecipeNotFound } from "@/components/recipes/recipe-not-found";
import { RecipePantryInsights } from "@/components/recipes/recipe-pantry-insights";
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
import type { PantryItem } from "@/types/pantry";
import type { Recipe } from "@/types/recipes";

export const metadata: Metadata = {
  title: "Recipe Details",
};

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const [userResponse, recipeResponse] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("recipes").select("*").eq("id", id).maybeSingle(),
  ]);

  const {
    data: { user },
  } = userResponse;

  if (!user) {
    redirect("/login");
  }

  const { data: recipe, error } = recipeResponse;

  if (error) {
    throw new Error(error.message);
  }

  if (!recipe) {
    return <RecipeNotFound />;
  }

  const recipeWithPreviewUrl = await addScanImagePreviewUrl(supabase, recipe);
  const { data: pantryData, error: pantryError } = await supabase
    .from("pantry_items")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  const ingredients = parseIngredients(recipeWithPreviewUrl.ingredients);
  const instructions = parseInstructions(recipeWithPreviewUrl.instructions);
  const notes = parseNotes(recipeWithPreviewUrl.extraction_notes);
  const totalTime = getTotalTime(recipeWithPreviewUrl);
  const difficulty = normalizeDifficulty(recipeWithPreviewUrl.difficulty);
  const pantryItems = pantryError ? [] : ((pantryData ?? []) as PantryItem[]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:max-w-5xl lg:px-8 lg:py-10">
      <div className="mb-4 flex items-center justify-between">
        <Link className={cn(buttonVariants({ variant: "secondary" }), "h-10 gap-2 rounded-xl")} href="/recipes">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>
        <button
          type="button"
          aria-label="Favorite recipe"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gravy-gold/30 bg-gravy-paper text-gravy-gold"
        >
          <Heart className="h-4 w-4 fill-gravy-gold" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-5 rounded-3xl border bg-card p-4 shadow-subtle sm:p-5">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-secondary">
          {recipeWithPreviewUrl.image_url ? (
            <Image
              fill
              priority
              alt={recipeWithPreviewUrl.title}
              className="object-cover"
              sizes="(min-width: 1024px) 56vw, 100vw"
              src={recipeWithPreviewUrl.image_url}
            />
          ) : (
            <RecipeImagePlaceholder iconClassName="h-16 w-16" />
          )}
        </div>

        <h1 className="text-3xl font-semibold leading-tight text-gravy-charcoal sm:text-4xl">
          {recipeWithPreviewUrl.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
            {formatMinutes(totalTime)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Signal className="h-4 w-4 text-primary" aria-hidden="true" />
            {difficulty}
          </span>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Recipe sections">
          <a className="rounded-full border bg-gravy-paper px-3 py-1.5 text-xs font-semibold text-gravy-charcoal" href="#overview">
            Overview
          </a>
          <a className="rounded-full border bg-gravy-paper px-3 py-1.5 text-xs font-semibold text-gravy-charcoal" href="#ingredients">
            Ingredients
          </a>
          <a className="rounded-full border bg-gravy-paper px-3 py-1.5 text-xs font-semibold text-gravy-charcoal" href="#steps">
            Steps
          </a>
          <a className="rounded-full border bg-gravy-paper px-3 py-1.5 text-xs font-semibold text-gravy-charcoal" href="#notes">
            Notes
          </a>
        </nav>

        <section id="overview" className="space-y-3">
          <h2 className="text-lg font-semibold text-gravy-charcoal">Summary</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {recipeWithPreviewUrl.description ||
              "A rich and cozy recipe ready to add to your weekly meal plan."}
          </p>
          {recipeWithPreviewUrl.source_url ? (
            <p className="text-sm text-muted-foreground">
              Source:{" "}
              <a
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                href={recipeWithPreviewUrl.source_url}
                rel="noreferrer"
                target="_blank"
              >
                {recipeWithPreviewUrl.source_name ?? "Original recipe"}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </p>
          ) : null}
          <div className="grid grid-cols-3 gap-2">
            <MetaCard icon={UsersRound} label="Servings" value={recipeWithPreviewUrl.servings ? String(recipeWithPreviewUrl.servings) : "-"} />
            <MetaCard icon={Timer} label="Prep Time" value={formatMinutes(recipeWithPreviewUrl.prep_time)} />
            <MetaCard icon={Clock3} label="Cook Time" value={formatMinutes(recipeWithPreviewUrl.cook_time)} />
          </div>
        </section>

        <section id="ingredients" className="space-y-3">
          <h2 className="text-lg font-semibold text-gravy-charcoal">Ingredients</h2>
          <RecipePantryInsights
            ingredients={ingredients}
            pantryItems={pantryItems}
            recipeTitle={recipeWithPreviewUrl.title}
            userId={user.id}
          />
        </section>

        <section id="steps" className="space-y-3">
          <h2 className="text-lg font-semibold text-gravy-charcoal">Steps</h2>
          {instructions.length > 0 ? (
            <ol className="space-y-2.5" aria-label="Cooking steps">
              {instructions.map((instruction, index) => (
                <li key={`${instruction}-${index}`} className="grid grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-xl bg-gravy-paper p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm leading-6 text-gravy-charcoal">{instruction}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">No steps have been added yet.</p>
          )}
        </section>

        <section id="notes" className="space-y-3">
          <h2 className="text-lg font-semibold text-gravy-charcoal">Notes</h2>
          {notes.length > 0 ? (
            <ul className="space-y-2">
              {notes.map((note, index) => (
                <li key={`${note}-${index}`} className="rounded-xl bg-gravy-paper px-3 py-2 text-sm text-gravy-charcoal">
                  {note}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">No notes yet for this recipe.</p>
          )}
        </section>
      </div>

      <div className="sticky bottom-[calc(5.8rem+env(safe-area-inset-bottom))] mt-4 rounded-2xl border bg-gravy-paper p-3 shadow-soft lg:static lg:mt-5 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <RecipeDetailActions recipe={recipeWithPreviewUrl} userId={user.id} />
      </div>
    </div>
  );
}

async function addScanImagePreviewUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recipe: Recipe,
) {
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
}

function parseNotes(notes: Recipe["extraction_notes"]): string[] {
  if (!notes) {
    return [];
  }

  if (Array.isArray(notes)) {
    return notes.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof notes === "string") {
    return notes
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  if (typeof notes === "object") {
    return Object.values(notes)
      .map((entry) => String(entry).trim())
      .filter(Boolean);
  }

  return [];
}

function MetaCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-gravy-paper p-2.5 text-center">
      <div className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-gravy-charcoal">{value}</p>
    </div>
  );
}
