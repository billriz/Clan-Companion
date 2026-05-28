import { describe, expect, it } from "vitest";

import {
  buildInstacartLineItem,
  filterExportableShoppingItems,
  normalizeIngredientName,
  normalizeUnit,
} from "@/lib/instacart/line-items";
import type { ShoppingListItem } from "@/types/shopping-list";

function createItem(overrides: Partial<ShoppingListItem>): ShoppingListItem {
  return {
    id: "item-1",
    user_id: "user-1",
    name: "milk",
    quantity: "1",
    unit: "gallon",
    category: "Dairy",
    checked: false,
    source: "manual",
    week_start: "2026-05-25",
    created_at: "2026-05-25T00:00:00.000Z",
    ...overrides,
  };
}

describe("Instacart ingredient normalization", () => {
  it("strips leading quantity and units while keeping useful detail", () => {
    expect(normalizeIngredientName("2 cups shredded cheddar cheese")).toBe("shredded cheddar cheese");
    expect(normalizeIngredientName("1 gallon milk")).toBe("milk");
    expect(normalizeIngredientName("3 large eggs")).toBe("eggs");
    expect(normalizeIngredientName("1 lb boneless skinless chicken breast")).toBe(
      "boneless skinless chicken breast",
    );
  });

  it("normalizes common units for Instacart measurements", () => {
    expect(normalizeUnit("cups")).toBe("cup");
    expect(normalizeUnit("Tbsp")).toBe("tablespoon");
    expect(normalizeUnit("lbs")).toBe("lb");
    expect(normalizeUnit("unknown-unit")).toBeNull();
  });

  it("builds Instacart line items with measurements", () => {
    const lineItem = buildInstacartLineItem(
      createItem({
        name: "1 lb boneless skinless chicken breast",
        quantity: "1",
        unit: "lb",
      }),
    );

    expect(lineItem).toMatchObject({
      name: "boneless skinless chicken breast",
      quantity: 1,
      unit: "lb",
    });
    expect(lineItem.line_item_measurements).toEqual([{ quantity: 1, unit: "lb" }]);
  });
});

describe("Instacart export filtering", () => {
  it("excludes checked items and zero-quantity pantry-covered items", () => {
    const filtered = filterExportableShoppingItems([
      createItem({ id: "item-1", name: "milk", checked: false, quantity: "1" }),
      createItem({ id: "item-2", name: "eggs", checked: true, quantity: "12" }),
      createItem({ id: "item-3", name: "salt", checked: false, quantity: "0" }),
      createItem({ id: "item-4", name: "", checked: false, quantity: "1" }),
    ]);

    expect(filtered.map((item) => item.id)).toEqual(["item-1"]);
  });

  it("handles empty lists", () => {
    expect(filterExportableShoppingItems([])).toEqual([]);
  });
});
