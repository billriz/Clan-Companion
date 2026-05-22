import { getWeekStart } from "@/lib/meal-plans";
import type { Ingredient } from "@/types/recipes";
import {
  SHOPPING_CATEGORIES,
  type CombinedShoppingIngredient,
  type ShoppingCategory,
  type ShoppingListItem,
} from "@/types/shopping-list";

export { getWeekStart };

type IngredientAccumulator = {
  name: string;
  quantityParts: string[];
  unit: string;
  category: ShoppingCategory;
  total: number;
  canSum: boolean;
  hasQuantity: boolean;
};

const preparationWords = new Set([
  "fresh",
  "large",
  "small",
  "medium",
  "diced",
  "chopped",
  "minced",
  "sliced",
  "shredded",
  "grated",
  "crushed",
  "ground",
  "cooked",
  "uncooked",
  "boneless",
  "skinless",
  "lean",
  "ripe",
  "whole",
  "optional",
]);

const unitAliases: Record<string, string> = {
  c: "cup",
  cup: "cup",
  cups: "cup",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tbsps: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tsps: "tsp",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  clove: "clove",
  cloves: "clove",
  can: "can",
  cans: "can",
  package: "package",
  packages: "package",
  pkg: "package",
  bunch: "bunch",
  bunches: "bunch",
};

const categoryKeywords: Record<ShoppingCategory, string[]> = {
  Frozen: ["frozen", "ice cream", "freezer"],
  "Spices & Seasonings": [
    "salt",
    "pepper",
    "garlic powder",
    "onion powder",
    "paprika",
    "cumin",
    "oregano",
    "basil",
    "thyme",
    "cinnamon",
    "chili powder",
    "seasoning",
    "spice",
    "herb",
    "curry powder",
  ],
  "Meat & Seafood": [
    "chicken",
    "beef",
    "pork",
    "turkey",
    "salmon",
    "fish",
    "shrimp",
    "tuna",
    "bacon",
    "sausage",
    "ham",
    "steak",
    "cod",
    "tilapia",
  ],
  Dairy: [
    "milk",
    "cheese",
    "yogurt",
    "butter",
    "cream",
    "sour cream",
    "egg",
    "eggs",
    "half and half",
  ],
  Bakery: ["bread", "buns", "bun", "tortilla", "tortillas", "rolls", "bagel", "pita", "naan"],
  Beverages: ["juice", "soda", "coffee", "tea", "water", "sparkling", "wine", "beer"],
  Produce: [
    "onion",
    "tomato",
    "lettuce",
    "spinach",
    "carrot",
    "potato",
    "garlic",
    "pepper",
    "broccoli",
    "cucumber",
    "avocado",
    "apple",
    "banana",
    "lemon",
    "lime",
    "cilantro",
    "parsley",
    "celery",
    "mushroom",
    "zucchini",
  ],
  Pantry: [
    "rice",
    "pasta",
    "flour",
    "beans",
    "lentils",
    "oats",
    "cereal",
    "sugar",
    "oil",
    "vinegar",
    "broth",
    "stock",
    "noodles",
    "quinoa",
    "breadcrumbs",
    "tomato sauce",
    "canned",
    "sauce",
  ],
  Other: [],
};

const categoryMatchOrder: ShoppingCategory[] = [
  "Frozen",
  "Spices & Seasonings",
  "Meat & Seafood",
  "Dairy",
  "Bakery",
  "Beverages",
  "Pantry",
  "Produce",
];

export function normalizeIngredientName(name: string) {
  const cleanedName = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const normalizedTokens = cleanedName
    .split(" ")
    .filter((token) => token && !preparationWords.has(token))
    .map(singularizeToken);

  return normalizedTokens.join(" ").trim();
}

export function categorizeIngredient(name: string): ShoppingCategory {
  const normalizedName = normalizeIngredientName(name);

  for (const category of categoryMatchOrder) {
    const keywords = categoryKeywords[category];
    if (keywords.some((keyword) => normalizedName.includes(keyword))) {
      return category;
    }
  }

  return "Other";
}

export function combineIngredients(ingredients: Ingredient[]): CombinedShoppingIngredient[] {
  const groupedIngredients = new Map<string, IngredientAccumulator>();

  for (const ingredient of ingredients) {
    const normalizedName = normalizeIngredientName(ingredient.name);

    if (!normalizedName) {
      continue;
    }

    const normalizedUnit = normalizeUnit(ingredient.unit);
    const key = `${normalizedName}|${normalizedUnit}`;
    const quantity = ingredient.quantity.trim();
    const parsedQuantity = quantity ? parseSimpleQuantity(quantity) : null;
    const existingIngredient = groupedIngredients.get(key);

    if (!existingIngredient) {
      groupedIngredients.set(key, {
        name: normalizedName,
        quantityParts: quantity ? [quantity] : [],
        unit: normalizedUnit,
        category: categorizeIngredient(normalizedName),
        total: parsedQuantity ?? 0,
        canSum: !quantity || parsedQuantity !== null,
        hasQuantity: Boolean(quantity),
      });
      continue;
    }

    if (quantity) {
      existingIngredient.quantityParts.push(quantity);
      existingIngredient.hasQuantity = true;
    }

    if (parsedQuantity === null && quantity) {
      existingIngredient.canSum = false;
    } else {
      existingIngredient.total += parsedQuantity ?? 0;
    }
  }

  return Array.from(groupedIngredients.values())
    .map((ingredient) => ({
      name: ingredient.name,
      quantity: resolveQuantity(ingredient),
      unit: ingredient.unit || null,
      category: ingredient.category,
    }))
    .sort(sortCombinedIngredients);
}

export function formatQuantity(quantity: number) {
  if (Number.isInteger(quantity)) {
    return String(quantity);
  }

  return quantity.toFixed(2).replace(/\.?0+$/, "");
}

export function groupShoppingItemsByCategory(items: ShoppingListItem[]) {
  const sortedItems = [...items].sort(sortShoppingListItems);

  return SHOPPING_CATEGORIES.reduce<Record<ShoppingCategory, ShoppingListItem[]>>(
    (groupedItems, category) => {
      groupedItems[category] = sortedItems.filter(
        (item) => normalizeCategory(item.category) === category,
      );
      return groupedItems;
    },
    {} as Record<ShoppingCategory, ShoppingListItem[]>,
  );
}

export function normalizeCategory(category: string | null | undefined): ShoppingCategory {
  return SHOPPING_CATEGORIES.includes(category as ShoppingCategory)
    ? (category as ShoppingCategory)
    : "Other";
}

export function getShoppingSourceLabel(source: string | null | undefined) {
  return source === "meal_plan" ? "Meal Plan" : "Manual";
}

export function formatItemAmount(item: Pick<ShoppingListItem, "quantity" | "unit">) {
  return [item.quantity, item.unit].filter(Boolean).join(" ").trim();
}

export function sortShoppingListItems(firstItem: ShoppingListItem, secondItem: ShoppingListItem) {
  const firstCategoryIndex = SHOPPING_CATEGORIES.indexOf(normalizeCategory(firstItem.category));
  const secondCategoryIndex = SHOPPING_CATEGORIES.indexOf(normalizeCategory(secondItem.category));

  if (firstCategoryIndex !== secondCategoryIndex) {
    return firstCategoryIndex - secondCategoryIndex;
  }

  if (Boolean(firstItem.checked) !== Boolean(secondItem.checked)) {
    return firstItem.checked ? 1 : -1;
  }

  return firstItem.name.localeCompare(secondItem.name);
}

function normalizeUnit(unit: string) {
  const cleanedUnit = unit.toLowerCase().replace(/\./g, "").trim();

  return unitAliases[cleanedUnit] ?? cleanedUnit;
}

function parseSimpleQuantity(value: string) {
  const cleanedValue = value.trim().replace(",", ".");

  if (!cleanedValue) {
    return null;
  }

  const wholeAndFractionMatch = cleanedValue.match(/^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)$/);
  if (wholeAndFractionMatch) {
    const whole = Number.parseFloat(wholeAndFractionMatch[1]);
    const numerator = Number.parseFloat(wholeAndFractionMatch[2]);
    const denominator = Number.parseFloat(wholeAndFractionMatch[3]);

    return denominator > 0 ? whole + numerator / denominator : null;
  }

  const fractionMatch = cleanedValue.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = Number.parseFloat(fractionMatch[1]);
    const denominator = Number.parseFloat(fractionMatch[2]);

    return denominator > 0 ? numerator / denominator : null;
  }

  const numericValue = Number.parseFloat(cleanedValue);
  return Number.isFinite(numericValue) && String(numericValue) === cleanedValue ? numericValue : null;
}

function resolveQuantity(ingredient: IngredientAccumulator) {
  if (!ingredient.hasQuantity) {
    return null;
  }

  if (ingredient.canSum) {
    return formatQuantity(ingredient.total);
  }

  return Array.from(new Set(ingredient.quantityParts)).join(" + ");
}

function singularizeToken(token: string) {
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith("oes") && token.length > 4) {
    return token.slice(0, -2);
  }

  if (token.endsWith("s") && !token.endsWith("ss") && token.length > 3) {
    return token.slice(0, -1);
  }

  return token;
}

function sortCombinedIngredients(
  firstIngredient: CombinedShoppingIngredient,
  secondIngredient: CombinedShoppingIngredient,
) {
  const firstCategoryIndex = SHOPPING_CATEGORIES.indexOf(firstIngredient.category);
  const secondCategoryIndex = SHOPPING_CATEGORIES.indexOf(secondIngredient.category);

  if (firstCategoryIndex !== secondCategoryIndex) {
    return firstCategoryIndex - secondCategoryIndex;
  }

  return firstIngredient.name.localeCompare(secondIngredient.name);
}
