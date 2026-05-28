import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RefreshCcw, ShoppingBasket } from "lucide-react";

import { ShoppingListPage } from "@/components/shopping-list/shopping-list-page";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getWeekEndKey, getWeekStartKey } from "@/lib/meal-plans";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { ShoppingListItem } from "@/types/shopping-list";

export const metadata: Metadata = {
  title: "Shopping List",
};

export default async function ShoppingListRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const initialWeekStartKey = getWeekStartKey(new Date());
  const initialWeekEndKey = getWeekEndKey(initialWeekStartKey);

  const [itemsResponse, plansResponse, shoppingListResponse, profileResponse] = await Promise.all([
    supabase
      .from("shopping_list_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", initialWeekStartKey)
      .order("checked", { ascending: true })
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("meal_plans")
      .select("id")
      .eq("user_id", user.id)
      .gte("planned_date", initialWeekStartKey)
      .lte("planned_date", initialWeekEndKey),
    supabase
      .from("shopping_lists")
      .upsert(
        {
          user_id: user.id,
          week_start: initialWeekStartKey,
        },
        {
          onConflict: "user_id,week_start",
        },
      )
      .select("id")
      .single(),
    supabase
      .from("profiles")
      .select("preferred_grocery_provider, preferred_grocery_store_name, preferred_grocery_store_notes")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const loadError =
    itemsResponse.error ??
    plansResponse.error ??
    shoppingListResponse.error ??
    (shoppingListResponse.data?.id ? null : new Error("Shopping list metadata could not be loaded."));

  if (loadError) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="blue">Weekly groceries</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal text-plate-charcoal sm:text-4xl">
              Shopping List
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Generate groceries from planned recipes for the current week.
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-subtle">
            <ShoppingBasket className="h-7 w-7" aria-hidden="true" />
          </div>
        </section>

        <section className="rounded-2xl border border-plate-terracotta/30 bg-plate-terracotta/10 p-5 text-sm leading-6 text-plate-terracotta shadow-subtle">
          <p>Shopping list data could not be loaded. {loadError.message}</p>
          <div className="mt-4">
            <Link className={cn(buttonVariants({ variant: "secondary" }), "gap-2")} href="/shopping-list">
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Retry
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const initialShoppingListId = shoppingListResponse.data?.id;

  if (!initialShoppingListId) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <section className="rounded-2xl border border-plate-terracotta/30 bg-plate-terracotta/10 p-5 text-sm leading-6 text-plate-terracotta shadow-subtle">
          <p>Shopping list metadata could not be loaded.</p>
        </section>
      </div>
    );
  }

  const preferredGroceryProvider =
    profileResponse.data?.preferred_grocery_provider?.trim() || "instacart";
  const preferredGroceryStoreName =
    profileResponse.data?.preferred_grocery_store_name?.trim() || "Woodman's";
  const preferredGroceryStoreNotes =
    profileResponse.data?.preferred_grocery_store_notes?.trim() || "";

  return (
    <ShoppingListPage
      initialItems={(itemsResponse.data ?? []) as ShoppingListItem[]}
      initialMealPlanCount={plansResponse.data?.length ?? 0}
      initialShoppingListId={initialShoppingListId}
      initialWeekStartKey={initialWeekStartKey}
      preferredGroceryProvider={preferredGroceryProvider}
      preferredGroceryStoreName={preferredGroceryStoreName}
      preferredGroceryStoreNotes={preferredGroceryStoreNotes}
      userId={user.id}
    />
  );
}
