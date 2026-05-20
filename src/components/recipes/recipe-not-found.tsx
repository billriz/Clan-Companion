import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RecipeNotFound() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full rounded-2xl border bg-white p-8 text-center shadow-subtle">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-plate-blue/10 text-plate-blue">
          <SearchX className="h-7 w-7" aria-hidden="true" />
        </div>
        <Badge className="mt-5" variant="neutral">
          Not found
        </Badge>
        <h1 className="mt-4 text-2xl font-semibold text-plate-charcoal">Recipe not found</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          It may have been deleted, or it may belong to another account.
        </p>
        <Link className={cn(buttonVariants(), "mt-6 gap-2")} href="/recipes">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to recipes
        </Link>
      </div>
    </div>
  );
}
