import { parseSimpleQuantity } from "@/lib/ingredients";
import type { ShoppingListItem } from "@/types/shopping-list";

export type InstacartMeasurement = {
  quantity: number;
  unit: string;
};

export type InstacartLineItem = {
  name: string;
  display_text?: string;
  quantity?: number;
  unit?: string;
  line_item_measurements?: InstacartMeasurement[];
};

export type InstacartProductsLinkPayload = {
  title: string;
  link_type: "shopping_list";
  instructions?: string[];
  line_items: InstacartLineItem[];
  landing_page_configuration?: {
    partner_linkback_url?: string;
  };
};

export type LowConfidenceItem = {
  itemId: string;
  name: string;
  reasons: string[];
};

const leadingCountWords = new Set(["a", "an"]);

const leadingQualifierWords = new Set([
  "large",
  "lrg",
  "lge",
  "lg",
  "medium",
  "med",
  "md",
  "small",
  "sm",
]);

const instacartUnitAliases: Record<string, string> = {
  c: "cup",
  cup: "cup",
  cups: "cup",
  tbsp: "tablespoon",
  tablespoon: "tablespoon",
  tablespoons: "tablespoon",
  tb: "tablespoon",
  tbs: "tablespoon",
  tsp: "teaspoon",
  teaspoon: "teaspoon",
  teaspoons: "teaspoon",
  ts: "teaspoon",
  tspn: "teaspoon",
  oz: "ounce",
  ounce: "ounce",
  ounces: "ounce",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  g: "gram",
  gram: "gram",
  grams: "gram",
  gs: "gram",
  kg: "kilogram",
  kgs: "kilogram",
  kilogram: "kilogram",
  kilograms: "kilogram",
  ml: "milliliter",
  mls: "milliliter",
  milliliter: "milliliter",
  milliliters: "milliliter",
  millilitre: "milliliter",
  millilitres: "milliliter",
  l: "liter",
  liter: "liter",
  liters: "liter",
  litre: "liter",
  litres: "liter",
  gallon: "gallon",
  gallons: "gallon",
  gal: "gallon",
  gals: "gallon",
  pint: "pint",
  pints: "pint",
  pt: "pint",
  pts: "pint",
  quart: "quart",
  quarts: "quart",
  qt: "quart",
  qts: "quart",
  can: "can",
  cans: "can",
  package: "package",
  packages: "package",
  pkg: "package",
  bunch: "bunch",
  bunches: "bunch",
  packet: "packet",
  packets: "packet",
  each: "each",
};

const likelyUnitWords = new Set<string>(Object.keys(instacartUnitAliases));

const ambiguousNameWords = new Set([
  "seasoning",
  "seasonings",
  "spice",
  "spices",
  "mix",
  "sauce",
  "dressing",
]);

export function normalizeIngredientName(value: string) {
  const cleanedValue = value
    .trim()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[,;]+/g, " ")
    .replace(/\s+/g, " ");

  if (!cleanedValue) {
    return "";
  }

  const tokens = cleanedValue.split(" ").filter(Boolean);
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index].toLowerCase();

    if (isQuantityToken(token) || leadingCountWords.has(token)) {
      index += 1;
      continue;
    }

    break;
  }

  while (index < tokens.length) {
    const token = tokens[index].toLowerCase().replace(/\.$/, "");

    if (!likelyUnitWords.has(token)) {
      break;
    }

    index += 1;
  }

  while (index < tokens.length) {
    const token = tokens[index].toLowerCase();

    if (!leadingQualifierWords.has(token)) {
      break;
    }

    index += 1;
  }

  if (tokens[index]?.toLowerCase() === "of") {
    index += 1;
  }

  const normalized = tokens.slice(index).join(" ").trim();

  return normalized || cleanedValue;
}

export function normalizeUnit(unit: string | null | undefined) {
  const cleanedUnit = (unit ?? "").trim().toLowerCase().replace(/\.$/, "");

  if (!cleanedUnit) {
    return null;
  }

  return instacartUnitAliases[cleanedUnit] ?? null;
}

export function buildInstacartLineItem(item: ShoppingListItem): InstacartLineItem {
  const normalizedName = normalizeIngredientName(item.name);
  const normalizedUnit = normalizeUnit(item.unit);
  const quantity = parseSimpleQuantity(item.quantity);
  const safeQuantity = quantity !== null && quantity > 0 ? Number(quantity.toFixed(2)) : 1;
  const measurementUnit = normalizedUnit ?? "each";

  return {
    name: normalizedName || item.name.trim(),
    display_text: buildDisplayText(item),
    quantity: safeQuantity,
    unit: measurementUnit,
    line_item_measurements: [
      {
        quantity: safeQuantity,
        unit: measurementUnit,
      },
    ],
  };
}

export function buildInstacartPayload({
  title,
  items,
  partnerLinkbackUrl,
}: {
  title: string;
  items: ShoppingListItem[];
  partnerLinkbackUrl?: string | null;
}): InstacartProductsLinkPayload {
  const payload: InstacartProductsLinkPayload = {
    title,
    link_type: "shopping_list",
    line_items: items.map((item) => buildInstacartLineItem(item)),
  };

  if (partnerLinkbackUrl) {
    payload.landing_page_configuration = {
      partner_linkback_url: partnerLinkbackUrl,
    };
  }

  return payload;
}

export function getLowConfidenceReasons(item: ShoppingListItem) {
  const reasons: string[] = [];
  const normalizedName = normalizeIngredientName(item.name).toLowerCase();
  const cleanQuantity = item.quantity?.trim() ?? "";
  const cleanUnit = item.unit?.trim() ?? "";

  if (!cleanQuantity) {
    reasons.push("Quantity is missing.");
  }

  if (cleanUnit.length === 0 && isAmbiguousName(normalizedName)) {
    reasons.push("Unit is missing for an ambiguous item.");
  }

  if (normalizedName.length < 3) {
    reasons.push("Item name is very short.");
  }

  if (normalizedName.includes("optional")) {
    reasons.push("Marked as optional.");
  }

  if (normalizedName.includes("to taste")) {
    reasons.push("Contains 'to taste'.");
  }

  if (normalizedName.includes("as needed")) {
    reasons.push("Contains 'as needed'.");
  }

  return reasons;
}

export function flagLowConfidenceItems(items: ShoppingListItem[]): LowConfidenceItem[] {
  return items
    .map((item) => ({
      itemId: item.id,
      name: item.name,
      reasons: getLowConfidenceReasons(item),
    }))
    .filter((item) => item.reasons.length > 0);
}

export function filterExportableShoppingItems(items: ShoppingListItem[]) {
  return items.filter((item) => {
    if (item.checked) {
      return false;
    }

    const cleanName = item.name.trim();

    if (!cleanName) {
      return false;
    }

    const parsedQuantity = parseSimpleQuantity(item.quantity);

    if (parsedQuantity !== null && parsedQuantity <= 0) {
      return false;
    }

    // Pantry adjustments happen before items reach shopping_list_items.
    // Export only uses the final needed amounts from this table.
    return true;
  });
}

function buildDisplayText(item: ShoppingListItem) {
  const amount = [item.quantity, item.unit].filter(Boolean).join(" ").trim();

  if (!amount && !item.category) {
    return item.name;
  }

  if (!item.category) {
    return `${amount} ${item.name}`.trim();
  }

  return `${amount} ${item.name} (${item.category})`.replace(/\s+/g, " ").trim();
}

function isQuantityToken(value: string) {
  if (/^\d+(?:\.\d+)?$/.test(value)) {
    return true;
  }

  if (/^\d+\/\d+$/.test(value)) {
    return true;
  }

  if (/^\d+[-–]\d+$/.test(value)) {
    return true;
  }

  return /^[¼½¾⅓⅔⅛]$/.test(value);
}

function isAmbiguousName(name: string) {
  const tokens = name.split(/\s+/).filter(Boolean);

  return tokens.some((token) => ambiguousNameWords.has(token));
}
