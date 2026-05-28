import { z } from "zod";

export const exportShoppingListSchema = z.object({
  shoppingListId: z.string().uuid("shoppingListId must be a valid UUID."),
});

export type ExportShoppingListPayload = z.infer<typeof exportShoppingListSchema>;
