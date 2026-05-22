"use client";

import { ShoppingListItem } from "@/components/shopping-list/shopping-list-item";
import type {
  ShoppingCategory,
  ShoppingListItem as ShoppingListItemType,
} from "@/types/shopping-list";

type ShoppingCategorySectionProps = {
  category: ShoppingCategory;
  items: ShoppingListItemType[];
  busyItemIds: Set<string>;
  onCheckedChange: (item: ShoppingListItemType, checked: boolean) => void;
  onDelete: (item: ShoppingListItemType) => void;
};

export function ShoppingCategorySection({
  category,
  items,
  busyItemIds,
  onCheckedChange,
  onDelete,
}: ShoppingCategorySectionProps) {
  if (items.length === 0) {
    return null;
  }

  const checkedCount = items.filter((item) => item.checked).length;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-plate-charcoal">{category}</h2>
          <p className="text-sm text-muted-foreground">
            {checkedCount} of {items.length} checked
          </p>
        </div>
        <span className="rounded-full border border-plate-blue/20 bg-plate-blue/10 px-3 py-1 text-sm font-semibold text-plate-blue">
          {items.length}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <ShoppingListItem
            key={item.id}
            item={item}
            isBusy={busyItemIds.has(item.id)}
            onCheckedChange={onCheckedChange}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}
