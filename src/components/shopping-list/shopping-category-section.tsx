"use client";

import { useState } from "react";

import { ShoppingListItem } from "@/components/shopping-list/shopping-list-item";
import { CategorySection } from "@/components/ui/category-section";
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
  const [expanded, setExpanded] = useState(true);

  if (items.length === 0) {
    return null;
  }

  const checkedCount = items.filter((item) => item.checked).length;

  return (
    <CategorySection
      title={category}
      count={items.length}
      collapsible
      expanded={expanded}
      onToggle={() => setExpanded((current) => !current)}
    >
      <p className="mb-3 text-xs text-muted-foreground">
        {checkedCount} of {items.length} checked
      </p>
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
    </CategorySection>
  );
}
