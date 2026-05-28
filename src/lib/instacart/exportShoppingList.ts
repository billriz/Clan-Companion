import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { InstacartApiError } from "@/lib/instacart/client";
import { getGroceryExportProvider } from "@/lib/grocery-export/providers";
import {
  buildInstacartPayload,
  filterExportableShoppingItems,
  flagLowConfidenceItems,
} from "@/lib/instacart/line-items";
import { createClient } from "@/lib/supabase/server";
import type { ShoppingListItem } from "@/types/shopping-list";
import type { Database } from "@/types/supabase";

export type InstacartExportServiceErrorCode =
  | "MISSING_CONFIG"
  | "SHOPPING_LIST_NOT_FOUND"
  | "NO_EXPORTABLE_ITEMS"
  | "MALFORMED_DATA"
  | "API_FAILURE"
  | "INTERNAL";

export class InstacartExportServiceError extends Error {
  code: InstacartExportServiceErrorCode;
  status: number;
  userMessage: string;

  constructor({
    code,
    status,
    message,
    userMessage,
  }: {
    code: InstacartExportServiceErrorCode;
    status: number;
    message: string;
    userMessage: string;
  }) {
    super(message);
    this.name = "InstacartExportServiceError";
    this.code = code;
    this.status = status;
    this.userMessage = userMessage;
  }
}

type AppSupabaseClient = SupabaseClient<Database>;

type GroceryPreference = {
  provider: string;
  storeName: string;
  storeNotes: string | null;
};

export type ExportShoppingListInput = {
  userId: string;
  shoppingListId: string;
  supabase?: AppSupabaseClient;
  fetchImpl?: typeof fetch;
  partnerLinkbackUrl?: string | null;
};

export type ExportShoppingListResult = {
  exportId: string;
  provider: "instacart";
  providerDisplayName: string;
  instacartUrl: string;
  shoppingListId: string;
  weekStartKey: string;
  itemCount: number;
  lowConfidenceItems: Array<{
    itemId: string;
    name: string;
    reasons: string[];
  }>;
  preference: GroceryPreference;
};

export async function exportShoppingList({
  userId,
  shoppingListId,
  supabase,
  fetchImpl,
  partnerLinkbackUrl,
}: ExportShoppingListInput): Promise<ExportShoppingListResult> {
  const instacartConfig = getInstacartConfig();
  const db = supabase ?? (await createClient());

  const { data: shoppingListRow, error: shoppingListError } = await db
    .from("shopping_lists")
    .select("id, week_start")
    .eq("id", shoppingListId)
    .eq("user_id", userId)
    .maybeSingle();

  if (shoppingListError) {
    throw new InstacartExportServiceError({
      code: "INTERNAL",
      status: 500,
      message: `Failed to load shopping list metadata: ${shoppingListError.message}`,
      userMessage: "We could not create your Instacart list right now.",
    });
  }

  if (!shoppingListRow) {
    throw new InstacartExportServiceError({
      code: "SHOPPING_LIST_NOT_FOUND",
      status: 404,
      message: `Shopping list ${shoppingListId} was not found for this user.`,
      userMessage: "Shopping list not found.",
    });
  }

  const { data: shoppingItemRows, error: itemsError } = await db
    .from("shopping_list_items")
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", shoppingListRow.week_start)
    .order("checked", { ascending: true })
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (itemsError) {
    throw new InstacartExportServiceError({
      code: "INTERNAL",
      status: 500,
      message: `Failed to load shopping list items: ${itemsError.message}`,
      userMessage: "We could not create your Instacart list right now.",
    });
  }

  const shoppingItems = (shoppingItemRows ?? []) as ShoppingListItem[];

  // Pantry adjustments happen in shopping-list generation before this point.
  // We export only final needed items from shopping_list_items.
  const exportableItems = filterExportableShoppingItems(shoppingItems);

  if (exportableItems.length === 0) {
    throw new InstacartExportServiceError({
      code: "NO_EXPORTABLE_ITEMS",
      status: 400,
      message: "Shopping list has no exportable items.",
      userMessage: "This shopping list has no items to export.",
    });
  }

  const preference = await getGroceryPreference(db, userId);
  const payload = buildInstacartPayload({
    title: `PlatePlan shopping list (${shoppingListRow.week_start})`,
    items: exportableItems,
    partnerLinkbackUrl,
  });

  if (payload.line_items.length === 0) {
    throw new InstacartExportServiceError({
      code: "MALFORMED_DATA",
      status: 400,
      message: "Instacart payload could not be constructed.",
      userMessage: "This shopping list has no items to export.",
    });
  }

  payload.instructions = [
    `Preferred store: ${preference.storeName} via Instacart`,
    "Review item matches and substitutions before checkout.",
  ];

  const lowConfidenceItems = flagLowConfidenceItems(exportableItems);

  const provider = getGroceryExportProvider("instacart");

  try {
    const providerResult = await provider.exportShoppingList({
      apiKey: instacartConfig.apiKey,
      apiBaseUrl: instacartConfig.apiBaseUrl,
      payload,
      fetchImpl,
    });

    const exportId = await insertExportLog({
      db,
      userId,
      shoppingListId,
      status: "success",
      providerUrl: providerResult.providerUrl,
      itemCount: exportableItems.length,
      errorMessage: null,
    });

    return {
      exportId,
      provider: providerResult.providerId,
      providerDisplayName: providerResult.displayName,
      instacartUrl: providerResult.providerUrl,
      shoppingListId,
      weekStartKey: shoppingListRow.week_start,
      itemCount: exportableItems.length,
      lowConfidenceItems,
      preference,
    };
  } catch (error) {
    const logErrorMessage = getLoggableErrorMessage(error);

    try {
      await insertExportLog({
        db,
        userId,
        shoppingListId,
        status: "failed",
        providerUrl: null,
        itemCount: exportableItems.length,
        errorMessage: logErrorMessage,
      });
    } catch (logError) {
      console.error("Failed to record failed Instacart export attempt", logError);
    }

    if (error instanceof InstacartApiError) {
      console.error("Instacart API export failed", {
        code: error.code,
        status: error.status,
        details: error.details,
      });

      throw new InstacartExportServiceError({
        code: "API_FAILURE",
        status: 502,
        message: `Instacart API export failed with ${error.code} (${error.status}).`,
        userMessage: "Instacart export is temporarily unavailable. Please try again.",
      });
    }

    if (error instanceof InstacartExportServiceError) {
      throw error;
    }

    console.error("Unexpected Instacart export failure", error);

    throw new InstacartExportServiceError({
      code: "INTERNAL",
      status: 500,
      message: "Unexpected error while exporting shopping list to Instacart.",
      userMessage: "We could not create your Instacart list right now.",
    });
  }
}

async function getGroceryPreference(db: AppSupabaseClient, userId: string): Promise<GroceryPreference> {
  const { data, error } = await db
    .from("profiles")
    .select("preferred_grocery_provider, preferred_grocery_store_name, preferred_grocery_store_notes")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load grocery preference", error);
  }

  const provider = data?.preferred_grocery_provider?.trim() || "instacart";
  const storeName = data?.preferred_grocery_store_name?.trim() || "Woodman's";
  const storeNotes = data?.preferred_grocery_store_notes?.trim() || null;

  return {
    provider,
    storeName,
    storeNotes,
  };
}

async function insertExportLog({
  db,
  userId,
  shoppingListId,
  status,
  providerUrl,
  itemCount,
  errorMessage,
}: {
  db: AppSupabaseClient;
  userId: string;
  shoppingListId: string;
  status: "success" | "failed";
  providerUrl: string | null;
  itemCount: number;
  errorMessage: string | null;
}) {
  const { data, error } = await db
    .from("shopping_list_exports")
    .insert({
      user_id: userId,
      shopping_list_id: shoppingListId,
      provider: "instacart",
      provider_url: providerUrl,
      status,
      item_count: itemCount,
      error_message: errorMessage,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new InstacartExportServiceError({
      code: "INTERNAL",
      status: 500,
      message: `Instacart export log could not be saved: ${error?.message ?? "missing id"}`,
      userMessage: "We could not create your Instacart list right now.",
    });
  }

  return data.id;
}

function getInstacartConfig() {
  const apiKey = process.env.INSTACART_API_KEY?.trim();
  const apiBaseUrl = process.env.INSTACART_API_BASE_URL?.trim();

  if (!apiKey || !apiBaseUrl) {
    throw new InstacartExportServiceError({
      code: "MISSING_CONFIG",
      status: 500,
      message: "Missing Instacart configuration. Set INSTACART_API_KEY and INSTACART_API_BASE_URL.",
      userMessage: "Instacart export is temporarily unavailable. Please try again.",
    });
  }

  return {
    apiKey,
    apiBaseUrl,
  };
}

function getLoggableErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 400);
  }

  return "Unknown Instacart export error";
}
