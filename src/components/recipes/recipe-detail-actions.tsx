"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, Pencil, Trash2 } from "lucide-react";

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
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="gap-2" type="button" onClick={() => setIsPlannerOpen(true)}>
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Add to Plan
        </Button>
        <Link
          className={cn(buttonVariants({ variant: "secondary" }), "gap-2")}
          href={`/recipes/edit/${recipe.id}`}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit
        </Link>
        <Button
          className="gap-2"
          type="button"
          variant="destructive"
          disabled={isDeleting}
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
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
        onOpenChange={setIsPlannerOpen}
      />
    </div>
  );
}
