export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="rounded-2xl border bg-white p-5 shadow-subtle sm:p-6">
        <div className="h-6 w-44 animate-pulse rounded-full bg-muted" />
        <div className="mt-4 h-10 w-full max-w-xl animate-pulse rounded bg-muted" />
        <div className="mt-3 h-5 w-full max-w-2xl animate-pulse rounded bg-muted" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border bg-white p-4 shadow-subtle">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-8 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted" />
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-2xl border bg-white p-6 shadow-subtle">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-muted" />
            <div className="mt-4 h-6 w-28 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </section>
    </div>
  );
}
