"use client";

import { useState } from "react";
import { RefreshCcw, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-plate-charcoal/35 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <button
            aria-label="Close generate list dialog"
            className="absolute inset-0 cursor-default"
            type="button"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-w-lg overflow-hidden rounded-t-2xl border bg-plate-paper shadow-soft sm:rounded-2xl">
            <header className="flex items-start justify-between gap-4 border-b bg-white px-4 py-4 sm:px-6">
              <div>
                <Badge variant="blue">Meal plan sync</Badge>
                <h2 className="mt-2 text-xl font-semibold text-plate-charcoal">
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
              <div className="flex gap-3 rounded-2xl border bg-white p-4 shadow-subtle">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-plate-charcoal">Replace Meal Plan items only</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Current generated items for this week will be replaced from planned recipes.
                    Manual items stay on your list.
                  </p>
                </div>
              </div>
            </div>

            <footer className="flex flex-col gap-2 border-t bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
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
                {isGenerating ? "Generating..." : "Replace Meal Plan Items"}
              </Button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
