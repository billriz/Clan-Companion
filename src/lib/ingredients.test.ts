import { describe, expect, it } from "vitest";

import { normalizeIngredientName, parseSimpleQuantity } from "@/lib/ingredients";

describe("normalizeIngredientName", () => {
  it("normalizes and singularizes common ingredient names", () => {
    expect(normalizeIngredientName("Tomatoes")).toBe("tomato");
    expect(normalizeIngredientName("Roma tomatoes")).toBe("roma tomato");
    expect(normalizeIngredientName("Chicken breasts")).toBe("chicken breast");
    expect(normalizeIngredientName("All-purpose flour")).toBe("all purpose flour");
  });

  it("trims whitespace and removes punctuation", () => {
    expect(normalizeIngredientName("  Fresh basil!!! ")).toBe("basil");
    expect(normalizeIngredientName("Onions (diced) ")).toBe("onion");
  });
});

describe("parseSimpleQuantity", () => {
  it("parses whole, decimal, and fraction quantities", () => {
    expect(parseSimpleQuantity("2")).toBe(2);
    expect(parseSimpleQuantity("1.5")).toBe(1.5);
    expect(parseSimpleQuantity("1/2")).toBe(0.5);
    expect(parseSimpleQuantity("1 1/2")).toBe(1.5);
  });

  it("returns null for unsupported quantity text", () => {
    expect(parseSimpleQuantity("to taste")).toBeNull();
  });
});
