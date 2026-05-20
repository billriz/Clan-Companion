"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, Pencil, Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type RecipeDetailActionsProps = {
  recipeId: string;
};

export function RecipeDetailActions({ recipeId }: RecipeDetailActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [planLabel, setPlanLabel] = useState("Add to Plan");
  const [error, setError] = useState<string | null>(null);

  function handlePlanClick() {
    setPlanLabel("Soon");
    window.setTimeout(() => setPlanLabel("Add to Plan"), 1200);
  }

  async function handleDelete() {
    const shouldDelete = window.confirm("Delete this recipe? This cannot be undone.");

    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase.from("recipes").delete().eq("id", recipeId);

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
        <Button className="gap-2" type="button" onClick={handlePlanClick}>
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          {planLabel}
        </Button>
        <Link
          className={cn(buttonVariants({ variant: "secondary" }), "gap-2")}
          href={`/recipes/edit/${recipeId}`}
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
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
