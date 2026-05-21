import type { MealPlanByDate, MealPlanWithRecipe, MealType } from "@/types/meal-plans";

export const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"] as const satisfies readonly MealType[];

const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const monthDayFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
});

export function isMealType(value: string | null | undefined): value is MealType {
  return MEAL_TYPES.includes(value as MealType);
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getWeekStart(date: Date) {
  const normalizedDate = startOfDay(date);
  const day = normalizedDate.getDay();
  const offset = day === 0 ? -6 : 1 - day;

  return addDays(normalizedDate, offset);
}

export function getWeekDays(weekStartKey: string) {
  const weekStart = parseDateKey(weekStartKey);

  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function getWeekEndKey(weekStartKey: string) {
  return formatDateKey(addDays(parseDateKey(weekStartKey), 6));
}

export function getWeekStartKey(date: Date) {
  return formatDateKey(getWeekStart(date));
}

export function formatWeekRange(weekStartKey: string) {
  const weekStart = parseDateKey(weekStartKey);
  const weekEnd = addDays(weekStart, 6);

  return `${monthDayFormatter.format(weekStart)} - ${monthDayFormatter.format(weekEnd)}`;
}

export function formatDayName(date: Date) {
  return dayFormatter.format(date);
}

export function formatLongDay(date: Date) {
  return longDateFormatter.format(date);
}

export function formatDayNumber(date: Date) {
  return String(date.getDate());
}

export function isTodayKey(dateKey: string) {
  return dateKey === formatDateKey(new Date());
}

export function groupMealPlansBySlot(plans: MealPlanWithRecipe[]) {
  return plans.reduce<MealPlanByDate>((groupedPlans, plan) => {
    if (!isMealType(plan.meal_type)) {
      return groupedPlans;
    }

    groupedPlans[plan.planned_date] = groupedPlans[plan.planned_date] ?? {};
    groupedPlans[plan.planned_date][plan.meal_type] = plan;

    return groupedPlans;
  }, {});
}

export function getMealPlanWeekKey(plan: Pick<MealPlanWithRecipe, "planned_date">) {
  return getWeekStartKey(parseDateKey(plan.planned_date));
}

export function sortMealPlans(firstPlan: MealPlanWithRecipe, secondPlan: MealPlanWithRecipe) {
  const dateComparison = firstPlan.planned_date.localeCompare(secondPlan.planned_date);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  const firstMealIndex = MEAL_TYPES.indexOf(firstPlan.meal_type as MealType);
  const secondMealIndex = MEAL_TYPES.indexOf(secondPlan.meal_type as MealType);

  return firstMealIndex - secondMealIndex;
}
