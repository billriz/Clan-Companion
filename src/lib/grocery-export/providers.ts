import "server-only";

import {
  createInstacartProductsLink,
  type InstacartRequestOptions,
} from "@/lib/instacart/client";
import type { InstacartProductsLinkPayload } from "@/lib/instacart/line-items";

export type GroceryExportProviderId = "instacart";

export type GroceryExportProviderResult = {
  providerId: GroceryExportProviderId;
  displayName: string;
  providerUrl: string;
};

export type GroceryExportProviderParams = {
  apiKey: string;
  apiBaseUrl: string;
  payload: InstacartProductsLinkPayload;
  fetchImpl?: typeof fetch;
};

export type GroceryExportProvider = {
  providerId: GroceryExportProviderId;
  displayName: string;
  exportShoppingList: (params: GroceryExportProviderParams) => Promise<GroceryExportProviderResult>;
};

const instacartProvider: GroceryExportProvider = {
  providerId: "instacart",
  displayName: "Instacart",
  async exportShoppingList({ apiKey, apiBaseUrl, payload, fetchImpl }) {
    const requestOptions: InstacartRequestOptions = {
      apiKey,
      baseUrl: apiBaseUrl,
      payload,
      fetchImpl,
    };

    const providerUrl = await createInstacartProductsLink(requestOptions);

    return {
      providerId: "instacart",
      displayName: "Instacart",
      providerUrl,
    };
  },
};

const providers: Record<GroceryExportProviderId, GroceryExportProvider> = {
  instacart: instacartProvider,
};

export function getGroceryExportProvider(providerId: GroceryExportProviderId) {
  return providers[providerId];
}
