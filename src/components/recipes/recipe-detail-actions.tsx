"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { AddMealDialog } from "@/components/meal-planner/add-meal-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/types/recipes";

type RecipeDetailActionsProps = {
  recipe: Recipe;
  userId: string;
};

export function RecipeDetailActions({ recipe, userId }: RecipeDetailActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleDelete() {
    const shouldDelete = window.confirm("Delete this recipe? This cannot be undone.");

    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase.from("recipes").delete().eq("id", recipe.id);

    if (deleteError) {
      setError(deleteError.message);
      setIsDeleting(false);
      return;
    }

    router.push("/recipes");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button className="h-11 gap-2 rounded-xl" type="button" onClick={() => setIsPlannerOpen(true)}>
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Add to Meal Plan
        </Button>
        <Button
          aria-label="More actions"
          aria-expanded={isMenuOpen}
          className="h-11 w-11 rounded-xl px-0"
          type="button"
          variant="secondary"
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {isMenuOpen ? (
        <div className="rounded-xl border bg-gravy-paper p-2 shadow-subtle">
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              className={cn(buttonVariants({ variant: "secondary" }), "h-10 gap-2 rounded-lg")}
              href={`/recipes/edit/${recipe.id}`}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit Recipe
            </Link>
            <Button
              className="h-10 gap-2 rounded-lg"
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {isDeleting ? "Deleting..." : "Delete Recipe"}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      {notice ? (
        <div
          className="rounded-xl border border-gravy-gold/25 bg-gravy-gold/10 px-3 py-2 text-sm text-gravy-brown"
          role="status"
        >
          {notice}
        </div>
      ) : null}

      <AddMealDialog
        key={isPlannerOpen ? recipe.id : "closed"}
        initialRecipeId={recipe.id}
        isOpen={isPlannerOpen}
        recipes={[recipe]}
        userId={userId}
        onMealAdded={() => setNotice(`${recipe.title} was added to your meal plan.`)}
        onOpenChange={(nextOpen) => {
          setIsPlannerOpen(nextOpen);
          if (!nextOpen) {
            setIsMenuOpen(false);
          }
        }}
      />
    </div>
  );
}
