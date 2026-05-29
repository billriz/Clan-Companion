"use client";

import { type FormEvent, useState } from "react";
import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModalShell } from "@/components/ui/modal-shell";
import { createClient } from "@/lib/supabase/client";
import {
  SHOPPING_CATEGORIES,
  type ShoppingCategory,
  type ShoppingListItem,
} from "@/types/shopping-list";

type AddShoppingItemFormProps = {
  isOpen: boolean;
  userId: string;
  weekStartKey: string;
  onOpenChange: (isOpen: boolean) => void;
  onItemAdded: (item: ShoppingListItem) => void;
};

export function AddShoppingItemForm({
  isOpen,
  userId,
  weekStartKey,
  onOpenChange,
  onItemAdded,
}: AddShoppingItemFormProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState<ShoppingCategory>("Other");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();

    if (!cleanName) {
      setError("Item name is required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("shopping_list_items")
      .insert({
        user_id: userId,
        name: cleanName,
        quantity: quantity.trim() || null,
        unit: unit.trim() || null,
        category,
        checked: false,
        source: "manual",
        week_start: weekStartKey,
      })
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
      setIsSaving(false);
      return;
    }

    onItemAdded(data as ShoppingListItem);
    resetForm();
    onOpenChange(false);
  }

  function resetForm() {
    setName("");
    setQuantity("");
    setUnit("");
    setCategory("Other");
    setError(null);
    setIsSaving(false);
  }

  function closeDialog() {
    if (isSaving) {
      return;
    }

    resetForm();
    onOpenChange(false);
  }

  return (
    <ModalShell
      isOpen={isOpen}
      labelledBy="add-shopping-item-title"
      describedBy="add-shopping-item-description"
      panelClassName="max-w-xl"
      onClose={closeDialog}
    >
      <form onSubmit={handleSubmit}>
        <header className="flex items-start justify-between gap-4 border-b bg-card px-4 py-4 sm:px-6">
          <div>
            <Badge variant="default">Manual item</Badge>
            <h2 id="add-shopping-item-title" className="mt-2 text-xl font-semibold text-gravy-charcoal">
              Add Item
            </h2>
            <p id="add-shopping-item-description" className="mt-1 text-sm text-muted-foreground">
              Add a grocery item for the selected week.
            </p>
          </div>
          <Button
            aria-label="Close"
            className="h-10 w-10 rounded-xl px-0"
            disabled={isSaving}
            type="button"
            variant="secondary"
            onClick={closeDialog}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </header>

        <div className="space-y-4 px-4 py-5 sm:px-6">
          <div className="space-y-2">
            <Label htmlFor="shoppingItemName">Item name</Label>
            <Input
              id="shoppingItemName"
              autoFocus
              required
              value={name}
              placeholder="Apples"
              disabled={isSaving}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shoppingItemQuantity">Quantity</Label>
              <Input
                id="shoppingItemQuantity"
                value={quantity}
                placeholder="6"
                disabled={isSaving}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shoppingItemUnit">Unit</Label>
              <Input
                id="shoppingItemUnit"
                value={unit}
                placeholder="ct"
                disabled={isSaving}
                onChange={(event) => setUnit(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shoppingItemCategory">Category</Label>
            <select
              id="shoppingItemCategory"
              className="flex h-11 w-full rounded-md border border-input bg-gravy-paper px-3 py-2 text-sm text-gravy-charcoal shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              value={category}
              disabled={isSaving}
              onChange={(event) => setCategory(event.target.value as ShoppingCategory)}
            >
              {SHOPPING_CATEGORIES.map((shoppingCategory) => (
                <option key={shoppingCategory} value={shoppingCategory}>
                  {shoppingCategory}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <div
              className="rounded-2xl border border-gravy-brown/30 bg-gravy-brown/10 px-4 py-3 text-sm text-gravy-brown"
              role="alert"
            >
              {error}
            </div>
          ) : null}
        </div>

        <footer className="flex flex-col gap-2 border-t bg-card px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button
            className="h-11 rounded-xl"
            disabled={isSaving}
            type="button"
            variant="secondary"
            onClick={closeDialog}
          >
            Cancel
          </Button>
          <Button className="h-11 gap-2 rounded-xl" disabled={isSaving} type="submit">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {isSaving ? "Adding..." : "Add Item"}
          </Button>
        </footer>
      </form>
    </ModalShell>
  );
}
