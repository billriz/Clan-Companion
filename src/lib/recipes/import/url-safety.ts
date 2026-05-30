import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const RECIPE_IMPORT_USER_AGENT = "gravytime-recipe-importer/1.0";
const MAX_URL_LENGTH = 2048;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "127.0.0.1",
  "::1",
  "[::1]",
]);

const BLOCKED_HOSTNAME_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".lan",
  ".home",
  ".corp",
  ".test",
];

export type UrlSafetyErrorCode =
  | "MISSING_URL"
  | "MALFORMED_URL"
  | "URL_TOO_LONG"
  | "UNSUPPORTED_PROTOCOL"
  | "UNSAFE_HOST"
  | "UNSAFE_IP"
  | "RESOLUTION_FAILED"
  | "REDIRECT_LIMIT"
  | "REDIRECT_LOCATION"
  | "TIMEOUT"
  | "FETCH_FAILED"
  | "UNSUPPORTED_CONTENT_TYPE"
  | "RESPONSE_TOO_LARGE"
  | "HTTP_ERROR";

export class UrlSafetyError extends Error {
  code: UrlSafetyErrorCode;
  status: number;
  userMessage: string;

  constructor(code: UrlSafetyErrorCode, message: string, status: number, userMessage: string) {
    super(message);
    this.name = "UrlSafetyError";
    this.code = code;
    this.status = status;
    this.userMessage = userMessage;
  }
}

type SafeFetchHtmlOptions = {
  maxRedirects: number;
  timeoutMs: number;
  maxBytes: number;
};

const DEFAULT_FETCH_OPTIONS: SafeFetchHtmlOptions = {
  maxRedirects: 4,
  timeoutMs: 12000,
  maxBytes: 1_500_000,
};

export function validateAndNormalizeExternalUrl(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new UrlSafetyError(
      "MISSING_URL",
      "Recipe URL is required.",
      400,
      "That link doesn’t look valid. Try pasting the full recipe URL.",
    );
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    throw new UrlSafetyError(
      "URL_TOO_LONG",
      `URL is too long (${trimmed.length} characters).`,
      400,
      "That link is too long. Try a shorter recipe URL.",
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw new UrlSafetyError(
      "MALFORMED_URL",
      "Recipe URL could not be parsed.",
      400,
      "That link doesn’t look valid. Try pasting the full recipe URL.",
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UrlSafetyError(
      "UNSUPPORTED_PROTOCOL",
      `Unsupported protocol: ${parsed.protocol}`,
      400,
      "For your safety, gravytime can’t import from that type of link.",
    );
  }

  if (!parsed.hostname) {
    throw new UrlSafetyError(
      "MALFORMED_URL",
      "Recipe URL hostname is missing.",
      400,
      "That link doesn’t look valid. Try pasting the full recipe URL.",
    );
  }

  const normalizedHostname = normalizeHostname(parsed.hostname);

  if (isBlockedHostname(normalizedHostname)) {
    throw new UrlSafetyError(
      "UNSAFE_HOST",
      `Blocked hostname: ${normalizedHostname}`,
      400,
      "For your safety, gravytime can’t import from that type of link.",
    );
  }

  const ipVersion = isIP(stripIpv6Brackets(normalizedHostname));

  if (ipVersion > 0 && isPrivateOrUnsafeIp(stripIpv6Brackets(normalizedHostname))) {
    throw new UrlSafetyError(
      "UNSAFE_IP",
      `Blocked IP host: ${normalizedHostname}`,
      400,
      "For your safety, gravytime can’t import from that type of link.",
    );
  }

  return parsed;
}

export async function safeFetchHtmlFromUrl(inputUrl: string, options?: Partial<SafeFetchHtmlOptions>) {
  const resolvedOptions: SafeFetchHtmlOptions = {
    ...DEFAULT_FETCH_OPTIONS,
    ...options,
  };

  let currentUrl = validateAndNormalizeExternalUrl(inputUrl).toString();

  for (let redirectCount = 0; redirectCount <= resolvedOptions.maxRedirects; redirectCount += 1) {
    const currentParsed = validateAndNormalizeExternalUrl(currentUrl);
    await assertHostnameResolvesPublic(currentParsed.hostname);

    let response: Response;

    try {
      response = await fetchWithTimeout(currentParsed.toString(), resolvedOptions.timeoutMs);
    } catch (error) {
      if (error instanceof UrlSafetyError) {
        throw error;
      }

      throw new UrlSafetyError(
        "FETCH_FAILED",
        `Could not fetch recipe page: ${String(error)}`,
        502,
        "Couldn’t automatically import this recipe. You can still add it manually.",
      );
    }

    if (isRedirectStatus(response.status)) {
      if (redirectCount >= resolvedOptions.maxRedirects) {
        throw new UrlSafetyError(
          "REDIRECT_LIMIT",
          "Too many redirects while fetching recipe page.",
          400,
          "Couldn’t automatically import this recipe. You can still add it manually.",
        );
      }

      const locationHeader = response.headers.get("location");

      if (!locationHeader) {
        throw new UrlSafetyError(
          "REDIRECT_LOCATION",
          "Redirect response was missing a location header.",
          400,
          "Couldn’t automatically import this recipe. You can still add it manually.",
        );
      }

      const nextUrl = new URL(locationHeader, currentParsed).toString();
      currentUrl = validateAndNormalizeExternalUrl(nextUrl).toString();
      continue;
    }

    if (!response.ok) {
      throw new UrlSafetyError(
        "HTTP_ERROR",
        `Recipe page returned HTTP ${response.status}.`,
        response.status,
        "Couldn’t automatically import this recipe. You can still add it manually.",
      );
    }

    const contentType = response.headers.get("content-type");

    if (
      contentType &&
      !contentType.toLowerCase().includes("text/html") &&
      !contentType.toLowerCase().includes("application/xhtml+xml")
    ) {
      throw new UrlSafetyError(
        "UNSUPPORTED_CONTENT_TYPE",
        `Unsupported content type for recipe page: ${contentType}`,
        400,
        "Couldn’t automatically import this recipe. You can still add it manually.",
      );
    }

    const html = await readResponseTextWithLimit(response, resolvedOptions.maxBytes);

    return {
      html,
      finalUrl: currentParsed.toString(),
      contentType,
    };
  }

  throw new UrlSafetyError(
    "REDIRECT_LIMIT",
    "Too many redirects while fetching recipe page.",
    400,
    "Couldn’t automatically import this recipe. You can still add it manually.",
  );
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent": RECIPE_IMPORT_USER_AGENT,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new UrlSafetyError(
        "TIMEOUT",
        `Recipe page request timed out after ${timeoutMs}ms.`,
        504,
        "Import is taking too long. Please try again.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponseTextWithLimit(response: Response, maxBytes: number) {
  if (!response.body) {
    const text = await response.text();

    if (Buffer.byteLength(text) > maxBytes) {
      throw new UrlSafetyError(
        "RESPONSE_TOO_LARGE",
        `Recipe page response exceeded ${maxBytes} bytes.`,
        413,
        "Couldn’t automatically import this recipe. You can still add it manually.",
      );
    }

    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maxBytes) {
      throw new UrlSafetyError(
        "RESPONSE_TOO_LARGE",
        `Recipe page response exceeded ${maxBytes} bytes.`,
        413,
        "Couldn’t automatically import this recipe. You can still add it manually.",
      );
    }

    chunks.push(decoder.decode(value, { stream: true }));
  }

  chunks.push(decoder.decode());
  return chunks.join("");
}

async function assertHostnameResolvesPublic(hostname: string) {
  const normalizedHostname = normalizeHostname(hostname);
  const ipVersion = isIP(stripIpv6Brackets(normalizedHostname));

  if (ipVersion > 0) {
    if (isPrivateOrUnsafeIp(stripIpv6Brackets(normalizedHostname))) {
      throw new UrlSafetyError(
        "UNSAFE_IP",
        `Blocked IP host: ${normalizedHostname}`,
        400,
        "For your safety, gravytime can’t import from that type of link.",
      );
    }

    return;
  }

  let resolvedAddresses: Array<{ address: string; family: number }> = [];

  try {
    resolvedAddresses = await lookup(normalizedHostname, {
      all: true,
      verbatim: true,
    });
  } catch {
    throw new UrlSafetyError(
      "RESOLUTION_FAILED",
      `Could not resolve hostname: ${normalizedHostname}`,
      400,
      "That link doesn’t look valid. Try pasting the full recipe URL.",
    );
  }

  if (!resolvedAddresses.length) {
    throw new UrlSafetyError(
      "RESOLUTION_FAILED",
      `No DNS records found for hostname: ${normalizedHostname}`,
      400,
      "That link doesn’t look valid. Try pasting the full recipe URL.",
    );
  }

  for (const resolved of resolvedAddresses) {
    if (isPrivateOrUnsafeIp(stripIpv6Brackets(resolved.address))) {
      throw new UrlSafetyError(
        "UNSAFE_IP",
        `Resolved IP is not allowed: ${resolved.address}`,
        400,
        "For your safety, gravytime can’t import from that type of link.",
      );
    }
  }
}

export function isPrivateOrUnsafeIp(value: string) {
  const normalized = stripIpv6Brackets(value.trim().toLowerCase());
  const ipVersion = isIP(normalized);

  if (!ipVersion) {
    return true;
  }

  if (ipVersion === 4) {
    return isPrivateOrUnsafeIpv4(normalized);
  }

  return isPrivateOrUnsafeIpv6(normalized);
}

function isPrivateOrUnsafeIpv4(value: string) {
  const octets = value.split(".").map((entry) => Number.parseInt(entry, 10));

  if (octets.length !== 4 || octets.some((entry) => !Number.isFinite(entry) || entry < 0 || entry > 255)) {
    return true;
  }

  const [first, second] = octets;

  if (first === 0) return true;
  if (first === 10) return true;
  if (first === 127) return true;
  if (first === 169 && second === 254) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first === 100 && second >= 64 && second <= 127) return true;
  if (first === 198 && (second === 18 || second === 19)) return true;
  if (first >= 224) return true;

  return false;
}

function isPrivateOrUnsafeIpv6(value: string) {
  if (value === "::" || value === "::1") {
    return true;
  }

  if (value.startsWith("fc") || value.startsWith("fd")) {
    return true;
  }

  if (/^fe[89ab]/i.test(value)) {
    return true;
  }

  if (value.startsWith("2001:db8")) {
    return true;
  }

  if (value.startsWith("::ffff:")) {
    const mappedIpv4 = value.slice("::ffff:".length);
    return isPrivateOrUnsafeIpv4(mappedIpv4);
  }

  return false;
}

function isBlockedHostname(hostname: string) {
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return true;
  }

  if (BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return true;
  }

  if (!hostname.includes(".") && isIP(stripIpv6Brackets(hostname)) === 0) {
    return true;
  }

  return false;
}

function normalizeHostname(hostname: string) {
  return stripIpv6Brackets(hostname.trim().toLowerCase().replace(/\.$/, ""));
}

function stripIpv6Brackets(value: string) {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1);
  }

  return value;
}

function isRedirectStatus(status: number) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}
