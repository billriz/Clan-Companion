import { ShoppingBasket } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export default function ShoppingListLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="blue">Phase 4</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-plate-charcoal sm:text-4xl">
            Shopping List
          </h1>
          <div className="mt-4 h-5 w-72 max-w-full animate-pulse rounded-full bg-muted" />
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-subtle">
          <ShoppingBasket className="h-7 w-7" aria-hidden="true" />
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-subtle">
        <div className="h-5 w-40 animate-pulse rounded-full bg-muted" />
        <div className="mt-4 h-2 rounded-full bg-muted" />
        <div className="mt-5 flex flex-wrap gap-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-11 w-36 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="rounded-2xl border bg-white p-4 shadow-subtle">
            <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] gap-3">
              <div className="h-11 w-11 animate-pulse rounded-xl bg-muted" />
              <div className="space-y-3">
                <div className="h-5 w-40 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-28 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="h-11 w-11 animate-pulse rounded-xl bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
