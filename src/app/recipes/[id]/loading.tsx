import { BrandLoadingState } from "@/components/brand/brand-loading-state";

export default function RecipeDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <BrandLoadingState className="mb-6" label="Loading recipe" />
      <div className="mb-6 h-10 w-36 animate-pulse rounded-md bg-secondary" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="aspect-video animate-pulse rounded-2xl bg-secondary" />
        <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-subtle">
          <div className="h-6 w-48 animate-pulse rounded bg-secondary" />
          <div className="h-10 w-full animate-pulse rounded bg-secondary" />
          <div className="h-5 w-full animate-pulse rounded bg-secondary" />
          <div className="h-5 w-4/5 animate-pulse rounded bg-secondary" />
        </div>
      </div>
    </div>
  );
}
