import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Camera, ChefHat, PenSquare, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { RecipeImportBrowser } from "@/components/recipes/recipe-import-browser";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Import Recipes",
};

export default function ImportRecipesPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 lg:max-w-5xl lg:px-8 lg:py-10">
      <PageHeader
        title="Import Recipes"
        description="Browse Spoonacular, import from a picture, or find ideas from your pantry."
        actions={
          <Link className={cn(buttonVariants({ variant: "secondary" }), "gap-2 rounded-xl")} href="/recipes">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Recipes
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link
          className="rounded-2xl border bg-card p-4 shadow-subtle transition hover:-translate-y-0.5 hover:shadow-soft"
          href="/recipes/import/spoonacular"
        >
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-gravy-charcoal">Browse Spoonacular</h2>
          <p className="mt-1 text-sm text-muted-foreground">Find and import online recipes.</p>
        </Link>
        <Link
          className="rounded-2xl border bg-card p-4 shadow-subtle transition hover:-translate-y-0.5 hover:shadow-soft"
          href="/recipes/import/scan"
        >
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gravy-gold/10 text-gravy-brown">
            <Camera className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-gravy-charcoal">Import from Picture</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use your camera or upload from gallery.</p>
        </Link>
        <Link
          className="rounded-2xl border bg-card p-4 shadow-subtle transition hover:-translate-y-0.5 hover:shadow-soft"
          href="/pantry#find-recipes-from-pantry"
        >
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gravy-brown/10 text-gravy-brown">
            <ChefHat className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-gravy-charcoal">Browse by Pantry</h2>
          <p className="mt-1 text-sm text-muted-foreground">Search Spoonacular using your pantry items.</p>
        </Link>
        <Link
          className="rounded-2xl border bg-card p-4 shadow-subtle transition hover:-translate-y-0.5 hover:shadow-soft"
          href="/recipes/new"
        >
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gravy-brown/10 text-gravy-brown">
            <PenSquare className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-gravy-charcoal">Add Manually</h2>
          <p className="mt-1 text-sm text-muted-foreground">Create your own recipe from scratch.</p>
        </Link>
      </section>

      <RecipeImportBrowser />
    </div>
  );
}
