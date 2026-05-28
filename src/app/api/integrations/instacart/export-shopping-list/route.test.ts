import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  mockCreateClient,
  mockExportShoppingList,
  MockInstacartExportServiceError,
} = vi.hoisted(() => {
  class HoistedInstacartExportServiceError extends Error {
    code: string;
    status: number;
    userMessage: string;

    constructor({
      code,
      status,
      message,
      userMessage,
    }: {
      code: string;
      status: number;
      message: string;
      userMessage: string;
    }) {
      super(message);
      this.code = code;
      this.status = status;
      this.userMessage = userMessage;
    }
  }

  return {
    mockCreateClient: vi.fn(),
    mockExportShoppingList: vi.fn(),
    MockInstacartExportServiceError: HoistedInstacartExportServiceError,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/lib/instacart/exportShoppingList", () => ({
  exportShoppingList: mockExportShoppingList,
  InstacartExportServiceError: MockInstacartExportServiceError,
}));

import { POST } from "@/app/api/integrations/instacart/export-shopping-list/route";

describe("POST /api/integrations/instacart/export-shopping-list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const response = await POST(
      new Request("http://localhost/api/integrations/instacart/export-shopping-list", {
        method: "POST",
        body: JSON.stringify({ shoppingListId: "e8ad11a9-7990-4e8d-a473-3a6f7ed3869d" }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Please sign in to export your shopping list.",
    });
  });

  it("returns a shoppable Instacart URL when export succeeds", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
    };

    mockCreateClient.mockResolvedValue(supabase);
    mockExportShoppingList.mockResolvedValue({
      exportId: "5db0ff3a-a8f7-44f8-b379-ca8825f93367",
      instacartUrl: "https://s.instacart.com/i/example",
      lowConfidenceItems: [],
      preference: {
        provider: "instacart",
        storeName: "Woodman's",
        storeNotes: null,
      },
    });

    const response = await POST(
      new Request("http://localhost/api/integrations/instacart/export-shopping-list", {
        method: "POST",
        body: JSON.stringify({ shoppingListId: "b44f3855-9c4f-4ecc-8d89-44f2d317f8d4" }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      instacartUrl: "https://s.instacart.com/i/example",
      exportId: "5db0ff3a-a8f7-44f8-b379-ca8825f93367",
      lowConfidenceItems: [],
      preference: {
        provider: "instacart",
        storeName: "Woodman's",
        storeNotes: null,
      },
    });

    expect(mockExportShoppingList).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        shoppingListId: "b44f3855-9c4f-4ecc-8d89-44f2d317f8d4",
      }),
    );
  });

  it("returns a safe error when Instacart export fails", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
    });

    mockExportShoppingList.mockRejectedValue(
      new MockInstacartExportServiceError({
        code: "API_FAILURE",
        status: 502,
        message: "Instacart API failed",
        userMessage: "Instacart export is temporarily unavailable. Please try again.",
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/integrations/instacart/export-shopping-list", {
        method: "POST",
        body: JSON.stringify({ shoppingListId: "27f88881-b57d-41a0-a03c-5ee2ca89498e" }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Instacart export is temporarily unavailable. Please try again.",
    });
  });

  it("returns a helpful error when no items are exportable", async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
      },
    });

    mockExportShoppingList.mockRejectedValue(
      new MockInstacartExportServiceError({
        code: "NO_EXPORTABLE_ITEMS",
        status: 400,
        message: "No exportable items",
        userMessage: "This shopping list has no items to export.",
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/integrations/instacart/export-shopping-list", {
        method: "POST",
        body: JSON.stringify({ shoppingListId: "e529ebb4-9e08-43d5-8ab2-340d7268325f" }),
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "This shopping list has no items to export.",
    });
  });
});
