"use client";

import { useState } from "react";
import { RefreshCcw, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";

type GenerateShoppingListButtonProps = {
  disabled?: boolean;
  isGenerating?: boolean;
  onGenerate: () => Promise<void>;
};

export function GenerateShoppingListButton({
  disabled = false,
  isGenerating = false,
  onGenerate,
}: GenerateShoppingListButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  async function handleGenerate() {
    await onGenerate();
    setIsOpen(false);
  }

  return (
    <>
      <Button
        className="h-11 gap-2 rounded-xl"
        disabled={disabled || isGenerating}
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <RefreshCcw className="h-4 w-4" aria-hidden="true" />
        {isGenerating ? "Generating..." : "Generate from Meal Plan"}
      </Button>

      <ModalShell
        isOpen={isOpen}
        labelledBy="generate-shopping-list-title"
        describedBy="generate-shopping-list-description"
        panelClassName="max-w-lg"
        onClose={() => setIsOpen(false)}
      >
        <header className="flex items-start justify-between gap-4 border-b bg-card px-4 py-4 sm:px-6">
          <div>
            <Badge variant="blue">Meal plan sync</Badge>
            <h2
              id="generate-shopping-list-title"
              className="mt-2 text-xl font-semibold text-gravy-charcoal"
            >
              Regenerate Shopping List
            </h2>
          </div>
          <Button
            aria-label="Close"
            className="h-10 w-10 rounded-xl px-0"
            disabled={isGenerating}
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </header>

        <div className="space-y-4 px-4 py-5 sm:px-6">
          <div className="flex gap-3 rounded-2xl border bg-card p-4 shadow-subtle">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-gravy-charcoal">Replace meal-plan items only</p>
              <p
                id="generate-shopping-list-description"
                className="mt-1 text-sm leading-6 text-muted-foreground"
              >
                Existing generated items for this week will be rebuilt from planned recipes. Manual
                items stay on the list.
              </p>
            </div>
          </div>
        </div>

        <footer className="flex flex-col gap-2 border-t bg-card px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button
            className="h-11 rounded-xl"
            disabled={isGenerating}
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="h-11 gap-2 rounded-xl"
            disabled={isGenerating}
            type="button"
            onClick={handleGenerate}
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            {isGenerating ? "Generating..." : "Replace Meal-Plan Items"}
          </Button>
        </footer>
      </ModalShell>
    </>
  );
}
