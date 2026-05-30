import { assertSafeHostname, parseAndNormalizeUrl } from "@/lib/recipes/import/url-safety";

const MAX_REDIRECTS = 3;
const MAX_HTML_BYTES = 1_500_000;
const REQUEST_TIMEOUT_MS = 10_000;
const DEFAULT_USER_AGENT = "gravytime-recipe-import/1.0";

const ACCEPT_HEADER = "text/html,application/xhtml+xml;q=0.9,*/*;q=0.6";

export class RecipePageFetchError extends Error {
  code: "TIMEOUT" | "NETWORK" | "BAD_RESPONSE" | "TOO_LARGE";
  status?: number;

  constructor(
    message: string,
    code: "TIMEOUT" | "NETWORK" | "BAD_RESPONSE" | "TOO_LARGE",
    status?: number,
  ) {
    super(message);
    this.name = "RecipePageFetchError";
    this.code = code;
    this.status = status;
  }
}

export async function fetchRecipePageHtml(initialUrl: string): Promise<{
  html: string;
  finalUrl: string;
}> {
  let currentUrl = parseAndNormalizeUrl(initialUrl).toString();

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const parsed = parseAndNormalizeUrl(currentUrl);
    await assertSafeHostname(parsed.hostname);

    const response = await fetchWithTimeout(parsed.toString());

    if (isRedirect(response.status)) {
      if (redirectCount >= MAX_REDIRECTS) {
        throw new RecipePageFetchError("Too many redirects while fetching that recipe.", "BAD_RESPONSE", response.status);
      }

      const location = response.headers.get("location");

      if (!location) {
        throw new RecipePageFetchError("The recipe page redirected without a valid destination.", "BAD_RESPONSE", response.status);
      }

      currentUrl = new URL(location, parsed).toString();
      continue;
    }

    if (!response.ok) {
      throw new RecipePageFetchError("The recipe page could not be loaded.", "BAD_RESPONSE", response.status);
    }

    const html = await readResponseBodyWithLimit(response, MAX_HTML_BYTES);

    if (!html.trim()) {
      throw new RecipePageFetchError("The recipe page was empty.", "BAD_RESPONSE", response.status);
    }

    return {
      html,
      finalUrl: parsed.toString(),
    };
  }

  throw new RecipePageFetchError("The recipe page could not be loaded.", "BAD_RESPONSE");
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: ACCEPT_HEADER,
        "User-Agent": process.env.RECIPE_IMPORT_USER_AGENT?.trim() || DEFAULT_USER_AGENT,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new RecipePageFetchError("Import is taking too long. Please try again.", "TIMEOUT");
    }

    throw new RecipePageFetchError("Could not fetch that recipe page.", "NETWORK");
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponseBodyWithLimit(response: Response, maxBytes: number) {
  const contentLengthHeader = response.headers.get("content-length");

  if (contentLengthHeader) {
    const declaredSize = Number.parseInt(contentLengthHeader, 10);

    if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
      throw new RecipePageFetchError("That recipe page is too large to import.", "TOO_LARGE", response.status);
    }
  }

  if (!response.body) {
    return await response.text();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maxBytes) {
      throw new RecipePageFetchError("That recipe page is too large to import.", "TOO_LARGE", response.status);
    }

    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;

  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  });

  const decoder = new TextDecoder("utf-8", { fatal: false });
  return decoder.decode(bytes);
}

function isRedirect(status: number) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}
