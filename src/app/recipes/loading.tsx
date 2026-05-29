import { BrandLoadingState } from "@/components/brand/brand-loading-state";
import { RecipeLoadingGrid } from "@/components/recipes/recipe-loading-grid";

export default function RecipesLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <BrandLoadingState label="Loading recipes" />

      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div className="h-7 w-36 animate-pulse rounded-full bg-secondary" />
          <div className="h-10 w-64 animate-pulse rounded bg-secondary" />
          <div className="h-5 w-full max-w-lg animate-pulse rounded bg-secondary" />
        </div>
        <div className="h-10 w-36 animate-pulse rounded-md bg-secondary" />
      </section>
      <div className="h-11 w-full animate-pulse rounded-md bg-secondary" />
      <RecipeLoadingGrid />
    </div>
  );
}
