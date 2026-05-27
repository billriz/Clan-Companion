import { describe, expect, it, vi } from "vitest";

import {
  compareRecipeToPantry,
  createPantryItem,
  deletePantryItem,
  getDefaultIngredientsForGroceryAdd,
  getMissingIngredients,
  updatePantryItem,
} from "@/lib/pantry";
import type { PantryItem } from "@/types/pantry";
import type { Ingredient } from "@/types/recipes";
import type { Database } from "@/types/supabase";

const pantrySeed: PantryItem = {
  id: "pantry-1",
  user_id: "user-1",
  household_id: null,
  name: "Tomatoes",
  normalized_name: "tomato",
  quantity: 2,
  unit: "cup",
  category: "Produce",
  location: "Pantry",
  notes: null,
  is_staple: false,
  low_stock_threshold: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("compareRecipeToPantry", () => {
  it("classifies have, missing, and partial ingredients", () => {
    const pantryItems: PantryItem[] = [
      pantrySeed,
      {
        ...pantrySeed,
        id: "pantry-2",
        name: "Chicken breast",
        normalized_name: "chicken breast",
        quantity: 1,
        unit: "lb",
      },
    ];

    const recipeIngredients: Ingredient[] = [
      { name: "Tomato", quantity: "1", unit: "cup" },
      { name: "Chicken breasts", quantity: "2", unit: "lb" },
      { name: "Garlic", quantity: "2", unit: "clove" },
    ];

    const comparison = compareRecipeToPantry(recipeIngredients, pantryItems);

    expect(comparison.availableCount).toBe(1);
    expect(comparison.totalCount).toBe(3);
    expect(comparison.missingIngredients).toHaveLength(1);
    expect(comparison.partialIngredients).toHaveLength(1);
    expect(comparison.matchPercentage).toBe(33);

    expect(comparison.availableIngredients[0].ingredient.name).toBe("Tomato");
    expect(comparison.partialIngredients[0].reason).toBe("insufficient_quantity");
    expect(comparison.missingIngredients[0].ingredient.name).toBe("Garlic");
  });

  it("returns only missing ingredients for default grocery add behavior", () => {
    const pantryItems: PantryItem[] = [pantrySeed];
    const recipeIngredients: Ingredient[] = [
      { name: "Tomatoes", quantity: "1", unit: "cup" },
      { name: "Pasta", quantity: "1", unit: "box" },
      { name: "Olive oil", quantity: "1", unit: "tbsp" },
    ];

    const missingIngredients = getMissingIngredients(recipeIngredients, pantryItems);
    const defaultIngredients = getDefaultIngredientsForGroceryAdd(recipeIngredients, pantryItems);

    expect(missingIngredients).toHaveLength(2);
    expect(defaultIngredients.map((ingredient) => ingredient.name)).toEqual([
      "Pasta",
      "Olive oil",
    ]);
  });
});

describe("pantry CRUD helpers", () => {
  it("normalizes name and numeric fields when creating pantry items", async () => {
    const single = vi.fn().mockResolvedValue({ data: pantrySeed, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });
    const supabase = { from } as unknown as import("@supabase/supabase-js").SupabaseClient<Database>;

    await createPantryItem({
      userId: "user-1",
      supabase,
      item: {
        name: "  Roma tomatoes  ",
        quantity: "2",
        unit: "cups",
        category: "Produce",
        location: "Pantry",
      },
    });

    expect(from).toHaveBeenCalledWith("pantry_items");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        name: "Roma tomatoes",
        normalized_name: "roma tomato",
        quantity: 2,
      }),
    );
  });

  it("updates pantry items and recomputes normalized name", async () => {
    const chain = {
      eq: vi.fn(),
      select: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: pantrySeed, error: null }),
    };
    chain.eq.mockReturnValue(chain);
    chain.select.mockReturnValue(chain);

    const update = vi.fn().mockReturnValue(chain);
    const from = vi.fn().mockReturnValue({ update });
    const supabase = { from } as unknown as import("@supabase/supabase-js").SupabaseClient<Database>;

    await updatePantryItem({
      id: "pantry-1",
      userId: "user-1",
      supabase,
      updates: {
        name: "All-purpose flours",
        quantity: "3",
      },
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "All-purpose flours",
        normalized_name: "all purpose flour",
        quantity: 3,
      }),
    );
    expect(chain.eq).toHaveBeenNthCalledWith(1, "id", "pantry-1");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
  });

  it("deletes pantry items scoped to user", async () => {
    const chain = {
      error: null,
      eq: vi.fn(),
    };
    chain.eq.mockReturnValue(chain);

    const del = vi.fn().mockReturnValue(chain);
    const from = vi.fn().mockReturnValue({ delete: del });
    const supabase = { from } as unknown as import("@supabase/supabase-js").SupabaseClient<Database>;

    await deletePantryItem({ id: "pantry-1", userId: "user-1", supabase });

    expect(del).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenNthCalledWith(1, "id", "pantry-1");
    expect(chain.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
  });
});
