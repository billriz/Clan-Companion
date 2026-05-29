import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RefreshCcw } from "lucide-react";

import { PantryPage } from "@/components/pantry/pantry-page";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { PantryItem } from "@/types/pantry";
import type { Recipe } from "@/types/recipes";

export const metadata: Metadata = {
  title: "Pantry",
};

export default async function PantryRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [pantryResponse, recipesResponse] = await Promise.all([
    supabase.from("pantry_items").select("*").eq("user_id", user.id).order("location", { ascending: true }).order("name", { ascending: true }),
    supabase.from("recipes").select("*").order("updated_at", { ascending: false }),
  ]);

  const loadError = pantryResponse.error ?? recipesResponse.error;

  if (loadError) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="rounded-2xl border border-gravy-brown/30 bg-gravy-brown/10 p-5 text-sm leading-6 text-gravy-brown shadow-subtle">
          Pantry data could not be loaded. {loadError.message}
          <div className="mt-4">
            <Link className={cn(buttonVariants({ variant: "secondary" }), "gap-2")} href="/pantry">
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Retry
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <PantryPage
      initialPantryItems={(pantryResponse.data ?? []) as PantryItem[]}
      recipes={(recipesResponse.data ?? []) as Recipe[]}
      userId={user.id}
    />
  );
}
