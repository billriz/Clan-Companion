"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onOpenChange]);

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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-plate-charcoal/35 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <button
        aria-label="Close add item dialog"
        className="absolute inset-0 cursor-default"
        type="button"
        onClick={closeDialog}
      />

      <form
        className="relative w-full max-w-xl overflow-hidden rounded-t-2xl border bg-plate-paper shadow-soft sm:rounded-2xl"
        onSubmit={handleSubmit}
      >
        <header className="flex items-start justify-between gap-4 border-b bg-white px-4 py-4 sm:px-6">
          <div>
            <Badge variant="default">Manual item</Badge>
            <h2 className="mt-2 text-xl font-semibold text-plate-charcoal">Add Item</h2>
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
              className="flex h-11 w-full rounded-md border border-input bg-plate-paper px-3 py-2 text-sm text-plate-charcoal shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className="rounded-2xl border border-plate-terracotta/30 bg-plate-terracotta/10 px-4 py-3 text-sm text-plate-terracotta">
              {error}
            </div>
          ) : null}
        </div>

        <footer className="flex flex-col gap-2 border-t bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
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
    </div>
  );
}
