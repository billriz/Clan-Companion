"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PantryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="rounded-2xl border border-plate-terracotta/30 bg-plate-terracotta/10 p-5 text-sm leading-6 text-plate-terracotta shadow-subtle">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5" aria-hidden="true" />
          <div>
            <p className="font-semibold">Pantry is having trouble loading.</p>
            <p className="mt-1">{error.message || "Please try again."}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className={cn(buttonVariants({ variant: "secondary" }), "gap-2")}
                type="button"
                onClick={reset}
              >
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                Retry
              </button>
              <Link className={cn(buttonVariants({ variant: "secondary" }))} href="/dashboard">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
