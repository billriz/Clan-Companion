import { BrandLoadingState } from "@/components/brand/brand-loading-state";

export default function MealPlannerLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <BrandLoadingState label="Loading meal planner" />

      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div className="h-7 w-24 animate-pulse rounded-full bg-secondary" />
          <div className="h-10 w-64 animate-pulse rounded bg-secondary" />
          <div className="h-5 w-full max-w-xl animate-pulse rounded bg-secondary" />
        </div>
        <div className="h-14 w-14 animate-pulse rounded-2xl bg-secondary" />
      </section>

      <div className="rounded-2xl border bg-card p-5 shadow-subtle">
        <div className="h-8 w-56 animate-pulse rounded bg-secondary" />
        <div className="mt-4 flex gap-2">
          <div className="h-11 w-11 animate-pulse rounded-xl bg-secondary" />
          <div className="h-11 w-32 animate-pulse rounded-xl bg-secondary" />
          <div className="h-11 w-11 animate-pulse rounded-xl bg-secondary" />
        </div>
      </div>

      <div className="hidden grid-cols-7 gap-4 lg:grid">
        {Array.from({ length: 7 }, (_, dayIndex) => (
          <div key={dayIndex} className="space-y-3">
            <div className="h-20 animate-pulse rounded-2xl bg-secondary" />
            {Array.from({ length: 3 }, (_, mealIndex) => (
              <div key={mealIndex} className="h-40 animate-pulse rounded-2xl bg-secondary" />
            ))}
          </div>
        ))}
      </div>

      <div className="space-y-4 lg:hidden">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-24 min-w-[86px] animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-2xl bg-secondary" />
        ))}
      </div>
    </div>
  );
}
