"use client";

import { Check, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatItemAmount, getShoppingSourceLabel, normalizeCategory } from "@/lib/shopping-list";
import { cn } from "@/lib/utils";
import type { ShoppingListItem as ShoppingListItemType } from "@/types/shopping-list";

type ShoppingListItemProps = {
  item: ShoppingListItemType;
  isBusy?: boolean;
  onCheckedChange: (item: ShoppingListItemType, checked: boolean) => void;
  onDelete: (item: ShoppingListItemType) => void;
};

export function ShoppingListItem({
  item,
  isBusy = false,
  onCheckedChange,
  onDelete,
}: ShoppingListItemProps) {
  const isChecked = Boolean(item.checked);
  const amount = formatItemAmount(item);
  const category = normalizeCategory(item.category);
  const sourceLabel = getShoppingSourceLabel(item.source);

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-subtle transition",
        isChecked && "bg-gravy-paper/70",
      )}
    >
      <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-start gap-3">
        <button
          aria-checked={isChecked}
          aria-label={isChecked ? `Mark ${item.name} unchecked` : `Mark ${item.name} checked`}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl border text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isChecked ? "border-primary bg-primary text-primary-foreground" : "border-primary/30 bg-primary/10",
          )}
          disabled={isBusy}
          role="checkbox"
          type="button"
          onClick={() => onCheckedChange(item, !isChecked)}
        >
          {isChecked ? <Check className="h-5 w-5" aria-hidden="true" /> : null}
        </button>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={cn(
                "text-base font-semibold leading-6 text-gravy-charcoal",
                isChecked && "text-muted-foreground line-through",
              )}
            >
              {item.name}
            </h3>
            <Badge variant="blue">{category}</Badge>
            {isChecked ? <Badge variant="neutral">Checked</Badge> : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {amount ? <span className={cn(isChecked && "line-through")}>{amount}</span> : null}
            <span className="rounded-full bg-secondary px-2 py-1 text-xs font-medium">{sourceLabel}</span>
          </div>
        </div>

        <Button
          aria-label={`Delete ${item.name}`}
          className="h-12 w-12 rounded-xl px-0 text-gravy-brown hover:bg-gravy-brown/10 hover:text-gravy-brown"
          disabled={isBusy}
          type="button"
          variant="ghost"
          onClick={() => onDelete(item)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}
