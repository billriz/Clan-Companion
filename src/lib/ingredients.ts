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

const unicodeFractions: Record<string, string> = {
  "½": "1/2",
  "⅓": "1/3",
  "⅔": "2/3",
  "¼": "1/4",
  "¾": "3/4",
  "⅛": "1/8",
};

export function normalizeIngredientName(name: string) {
  const cleanedName = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const normalizedTokens = cleanedName
    .split(" ")
    .filter((token) => token && !preparationWords.has(token))
    .map(singularizeToken);

  return normalizedTokens.join(" ").trim();
}

export function normalizeMeasurementUnit(unit: string | null | undefined) {
  const cleanedUnit = (unit ?? "").toLowerCase().replace(/\./g, "").trim();

  if (!cleanedUnit) {
    return "";
  }

  return unitAliases[cleanedUnit] ?? cleanedUnit;
}

export function isCompatibleUnit(
  firstUnit: string | null | undefined,
  secondUnit: string | null | undefined,
) {
  const normalizedFirstUnit = normalizeMeasurementUnit(firstUnit);
  const normalizedSecondUnit = normalizeMeasurementUnit(secondUnit);

  return Boolean(normalizedFirstUnit) && normalizedFirstUnit === normalizedSecondUnit;
}

export function parseSimpleQuantity(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalizedValue = value
    .trim()
    .replace(/,/g, ".")
    .replace(/[½⅓⅔¼¾⅛]/g, (fraction) => ` ${unicodeFractions[fraction] ?? fraction}`)
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedValue) {
    return null;
  }

  const rangeMatch = normalizedValue.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    return Number.parseFloat(rangeMatch[1]);
  }

  const wholeAndFractionMatch = normalizedValue.match(/^(\d+(?:\.\d+)?)\s+(\d+)\/(\d+)$/);
  if (wholeAndFractionMatch) {
    const whole = Number.parseFloat(wholeAndFractionMatch[1]);
    const numerator = Number.parseFloat(wholeAndFractionMatch[2]);
    const denominator = Number.parseFloat(wholeAndFractionMatch[3]);

    return denominator > 0 ? whole + numerator / denominator : null;
  }

  const fractionMatch = normalizedValue.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = Number.parseFloat(fractionMatch[1]);
    const denominator = Number.parseFloat(fractionMatch[2]);

    return denominator > 0 ? numerator / denominator : null;
  }

  const numericMatch = normalizedValue.match(/^\d+(?:\.\d+)?$/);
  if (numericMatch) {
    const numericValue = Number.parseFloat(normalizedValue);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return null;
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
