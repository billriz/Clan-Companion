export function RecipeLoadingGrid() {
  return (
    <div className="grid auto-rows-fr grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="min-h-[420px] overflow-hidden rounded-2xl border bg-card shadow-subtle"
        >
          <div className="aspect-video animate-pulse bg-secondary" />
          <div className="space-y-4 p-4">
            <div className="h-5 w-3/4 animate-pulse rounded bg-secondary" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-secondary" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-4">
              <div className="h-4 animate-pulse rounded bg-secondary" />
              <div className="h-4 animate-pulse rounded bg-secondary" />
              <div className="h-4 animate-pulse rounded bg-secondary" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
