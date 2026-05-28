import { NextResponse } from "next/server";

import {
  exportShoppingList,
  InstacartExportServiceError,
} from "@/lib/instacart/exportShoppingList";
import { createClient } from "@/lib/supabase/server";
import { exportShoppingListSchema } from "@/lib/validations/instacart";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "Please sign in to export your shopping list.",
      },
      { status: 401 },
    );
  }

  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body.",
      },
      { status: 400 },
    );
  }

  const parsedBody = exportShoppingListSchema.safeParse(requestBody);

  if (!parsedBody.success) {
    const firstIssue = parsedBody.error.issues[0];

    return NextResponse.json(
      {
        success: false,
        error: firstIssue?.message ?? "Invalid request body.",
      },
      { status: 400 },
    );
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

    const result = await exportShoppingList({
      userId: user.id,
      shoppingListId: parsedBody.data.shoppingListId,
      supabase,
      partnerLinkbackUrl: appUrl ? `${appUrl.replace(/\/$/, "")}/shopping-list` : null,
    });

    return NextResponse.json(
      {
        success: true,
        instacartUrl: result.instacartUrl,
        exportId: result.exportId,
        lowConfidenceItems: result.lowConfidenceItems,
        preference: result.preference,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof InstacartExportServiceError) {
      return NextResponse.json(
        {
          success: false,
          error: error.userMessage,
        },
        { status: error.status },
      );
    }

    console.error("Unexpected Instacart export route error", error);

    return NextResponse.json(
      {
        success: false,
        error: "We could not create your Instacart list right now.",
      },
      { status: 500 },
    );
  }
}
