import { describe, expect, it } from "vitest";

import {
  buildShoppingPayloadFromMissedIngredients,
  filterIngredientItemsToFood,
  normalizeIngredientNames,
  normalizePantryRecipeSearchResults,
  parsePantryRecipeSearchParams,
  PantryRecipeSearchInputError,
  shouldDefaultSelectPantryItem,
} from "@/lib/pantry-recipe-search";

describe("pantry recipe search ingredient normalization", () => {
  it("normalizes names and removes duplicates", () => {
    const normalized = normalizeIngredientNames([
      "  Tomatoes ",
      "tomato",
      "Olive Oils",
      "",
      "   ",
      "Chicken breasts",
    ]);

    expect(normalized).toEqual(["chicken breast", "olive oil", "tomato"]);
  });

  it("filters non-food categories when ingredient category data is provided", () => {
    const filtered = filterIngredientItemsToFood([
      { name: "Dish Soap", category: "Household" },
      { name: "Chicken breast", category: "Meat & Seafood" },
      { name: "Paper towels", category: "Household Supplies" },
      { name: "Roma tomatoes", category: "Produce" },
    ]);

    expect(filtered).toEqual(["chicken breast", "roma tomato"]);
  });

  it("default-selects food items and default-deselects common pantry staples", () => {
    expect(shouldDefaultSelectPantryItem({ name: "Chicken breast", category: "Meat & Seafood" })).toBe(true);
    expect(shouldDefaultSelectPantryItem({ name: "Salt", category: "Spices" })).toBe(false);
    expect(shouldDefaultSelectPantryItem({ name: "Laundry detergent", category: "Household" })).toBe(false);
  });
});

describe("parsePantryRecipeSearchParams", () => {
  it("validates inputs and applies defaults", () => {
    const parsed = parsePantryRecipeSearchParams({
      ingredientNames: ["Tomatoes", "Tomato", " Pasta "],
    });

    expect(parsed.ingredientNames).toEqual(["pasta", "tomato"]);
    expect(parsed.number).toBe(12);
    expect(parsed.ranking).toBe(2);
    expect(parsed.ignorePantry).toBe(false);
  });

  it("throws an input error when no valid ingredients are selected", () => {
    expect(() =>
      parsePantryRecipeSearchParams({
        ingredientNames: ["  "],
      }),
    ).toThrowError(PantryRecipeSearchInputError);
  });

  it("throws on invalid number and ranking", () => {
    expect(() =>
      parsePantryRecipeSearchParams({
        ingredientNames: ["tomato"],
        number: "0",
      }),
    ).toThrowError("number must be a positive integer.");

    expect(() =>
      parsePantryRecipeSearchParams({
        ingredientNames: ["tomato"],
        ranking: 3,
      }),
    ).toThrowError("ranking must be 1 or 2.");
  });
});

describe("normalizePantryRecipeSearchResults", () => {
  it("normalizes a Spoonacular findByIngredients payload", () => {
    const normalized = normalizePantryRecipeSearchResults([
      {
        id: 101,
        title: "Tomato Pasta",
        image: "https://img.spoonacular.com/recipes/101-312x231.jpg",
        usedIngredientCount: 2,
        missedIngredientCount: 1,
        usedIngredients: [{ id: 1, name: "tomato", amount: 2, unit: "whole", original: "2 tomatoes" }],
        missedIngredients: [{ id: 2, name: "basil", amount: 1, unit: "tbsp", original: "1 tbsp basil" }],
        unusedIngredients: [],
      },
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({
      id: 101,
      title: "Tomato Pasta",
      usedIngredientCount: 2,
      missedIngredientCount: 1,
      source: "spoonacular",
    });
    expect(normalized[0].usedIngredients[0].name).toBe("tomato");
    expect(normalized[0].missedIngredients[0].unit).toBe("tbsp");
  });

  it("returns an empty array for empty or invalid payloads", () => {
    expect(normalizePantryRecipeSearchResults([])).toEqual([]);
    expect(normalizePantryRecipeSearchResults({ results: [] })).toEqual([]);
  });
});

describe("buildShoppingPayloadFromMissedIngredients", () => {
  it("converts missed ingredients to the shopping list payload format", () => {
    const payload = buildShoppingPayloadFromMissedIngredients({
      missedIngredients: [
        { name: "Milk", amount: 1, unit: "cup" },
        { name: "milk", amount: 2, unit: "cups" },
        { name: "Garlic", amount: 3, unit: "cloves" },
      ],
      userId: "user-1",
      weekStartKey: "2026-05-25",
    });

    expect(payload).toHaveLength(2);
    expect(payload[0]).toEqual(
      expect.objectContaining({
        user_id: "user-1",
        week_start: "2026-05-25",
        source: "manual",
      }),
    );

    expect(payload.find((item) => item.name === "milk")).toEqual(
      expect.objectContaining({ quantity: "3", unit: "cup" }),
    );
    expect(payload.find((item) => item.name === "garlic")).toEqual(
      expect.objectContaining({ quantity: "3", unit: "clove" }),
    );
  });
});
