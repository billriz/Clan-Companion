"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MealPlannerErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function MealPlannerError({ error, reset }: MealPlannerErrorProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full rounded-2xl border border-destructive/30 bg-white p-8 text-center shadow-subtle">
        <h1 className="text-2xl font-semibold text-plate-charcoal">Meal planner unavailable</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          The meal planner encountered an issue. {error.message}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button className="gap-2" type="button" onClick={reset}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <Link className={cn(buttonVariants({ variant: "secondary" }))} href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
