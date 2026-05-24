import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Camera, PenSquare, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Import Recipes",
};

export default function ImportRecipesPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="blue">Recipe import</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-plate-charcoal sm:text-4xl">
            Import Recipes
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Choose how you want to bring recipes into your PlatePlan library.
          </p>
        </div>
        <Link className={cn(buttonVariants({ variant: "secondary" }), "gap-2")} href="/recipes">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          My Recipes
        </Link>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-2xl border bg-white p-6 shadow-subtle">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-plate-terracotta/10 text-plate-terracotta">
            <PenSquare className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-plate-charcoal">Manual Entry</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Add your own recipe details by hand with full control over ingredients and steps.
          </p>
          <Link className={cn(buttonVariants(), "mt-6 inline-flex")} href="/recipes/new">
            Create Manually
          </Link>
        </article>

        <article className="rounded-2xl border bg-white p-6 shadow-subtle">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-plate-charcoal">Import from Spoonacular</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Browse online recipe ideas and import them with ingredients and instructions.
          </p>
          <Link className={cn(buttonVariants(), "mt-6 inline-flex")} href="/recipes/import/spoonacular">
            Browse Spoonacular
          </Link>
        </article>

        <article className="rounded-2xl border bg-white p-6 shadow-subtle">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-plate-blue/10 text-plate-blue">
            <Camera className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-plate-charcoal">Scan Recipe</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Upload or take a photo of a recipe card, cookbook snippet, or handwritten recipe.
          </p>
          <Link className={cn(buttonVariants(), "mt-6 inline-flex")} href="/recipes/import/scan">
            Scan Recipe
          </Link>
        </article>
      </section>
    </div>
  );
}
