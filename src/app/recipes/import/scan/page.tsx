import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { RecipeScanClient } from "@/components/recipes/recipe-scan-client";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Scan a Recipe",
};

export default function ScanRecipePage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="blue">Recipe import</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-plate-charcoal sm:text-4xl">
            Scan a Recipe
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            Upload a recipe card, cookbook snippet, or handwritten recipe.
          </p>
        </div>
        <Link className={cn(buttonVariants({ variant: "secondary" }), "gap-2")} href="/recipes/import">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Import Recipes
        </Link>
      </section>

      <RecipeScanClient />
    </div>
  );
}
