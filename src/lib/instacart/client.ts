import "server-only";

import type { InstacartProductsLinkPayload } from "@/lib/instacart/line-items";

export type InstacartProductsLinkResponse = {
  products_link_url?: string;
};

export type InstacartRequestOptions = {
  apiKey: string;
  baseUrl: string;
  payload: InstacartProductsLinkPayload;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export type InstacartErrorCode =
  | "NETWORK"
  | "TIMEOUT"
  | "AUTH"
  | "BAD_REQUEST"
  | "SERVER"
  | "BAD_RESPONSE"
  | "UNKNOWN";

export class InstacartApiError extends Error {
  code: InstacartErrorCode;
  status: number;
  details?: unknown;

  constructor(message: string, code: InstacartErrorCode, status: number, details?: unknown) {
    super(message);
    this.name = "InstacartApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function createInstacartProductsLink({
  apiKey,
  baseUrl,
  payload,
  fetchImpl = fetch,
  timeoutMs = 12000,
}: InstacartRequestOptions): Promise<string> {
  const endpoint = `${baseUrl.replace(/\/$/, "")}/idp/v1/products/products_link`;
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });

    const responsePayload = await parsePayload(response);

    if (!response.ok) {
      throw mapInstacartError(response.status, responsePayload);
    }

    if (!responsePayload || typeof responsePayload !== "object" || Array.isArray(responsePayload)) {
      throw new InstacartApiError(
        "Instacart returned an unexpected response format.",
        "BAD_RESPONSE",
        502,
        responsePayload,
      );
    }

    const responseRecord = responsePayload as Record<string, unknown>;
    const productsLinkUrl = responseRecord.products_link_url;

    if (typeof productsLinkUrl !== "string" || !productsLinkUrl.trim()) {
      throw new InstacartApiError(
        "Instacart returned an unexpected response format.",
        "BAD_RESPONSE",
        502,
        responsePayload,
      );
    }

    return productsLinkUrl;
  } catch (error) {
    if (error instanceof InstacartApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new InstacartApiError(
        "Instacart request timed out.",
        "TIMEOUT",
        504,
        error,
      );
    }

    throw new InstacartApiError(
      "Could not reach Instacart.",
      "NETWORK",
      502,
      error,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function parsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    return { message: text };
  }

  try {
    return (await response.json()) as InstacartProductsLinkResponse;
  } catch {
    throw new InstacartApiError(
      "Instacart returned malformed JSON.",
      "BAD_RESPONSE",
      502,
    );
  }
}

function mapInstacartError(status: number, payload: unknown) {
  const message = readErrorMessage(payload) ?? "Instacart request failed.";

  if (status === 401 || status === 403) {
    return new InstacartApiError(
      "Instacart authentication failed.",
      "AUTH",
      502,
      payload,
    );
  }

  if (status === 400 || status === 404 || status === 422) {
    return new InstacartApiError(message, "BAD_REQUEST", status, payload);
  }

  if (status >= 500) {
    return new InstacartApiError(
      "Instacart is temporarily unavailable.",
      "SERVER",
      502,
      payload,
    );
  }

  return new InstacartApiError(message, "UNKNOWN", status, payload);
}

function readErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }

  if (typeof record.error === "string" && record.error.trim()) {
    return record.error.trim();
  }

  if (Array.isArray(record.errors) && record.errors.length > 0) {
    const firstError = record.errors[0];

    if (firstError && typeof firstError === "object" && !Array.isArray(firstError)) {
      const firstErrorRecord = firstError as Record<string, unknown>;

      if (typeof firstErrorRecord.message === "string" && firstErrorRecord.message.trim()) {
        return firstErrorRecord.message.trim();
      }
    }
  }

  return null;
}
