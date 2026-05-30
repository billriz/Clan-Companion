import dns from "node:dns/promises";
import net from "node:net";

import { MAX_IMPORT_URL_LENGTH } from "@/lib/recipes/import/validation";

const BLOCKED_HOSTNAME_SUFFIXES = [
  ".local",
  ".localhost",
  ".internal",
  ".home",
  ".lan",
  ".test",
  ".invalid",
];

export class UrlSafetyError extends Error {
  code: "INVALID_URL" | "UNSAFE_URL" | "URL_TOO_LONG" | "UNSUPPORTED_PROTOCOL";

  constructor(
    message: string,
    code: "INVALID_URL" | "UNSAFE_URL" | "URL_TOO_LONG" | "UNSUPPORTED_PROTOCOL",
  ) {
    super(message);
    this.name = "UrlSafetyError";
    this.code = code;
  }
}

export async function normalizeAndAssertSafeHttpUrl(rawUrl: string): Promise<string> {
  const parsed = parseAndNormalizeUrl(rawUrl);
  await assertSafeHostname(parsed.hostname);
  return parsed.toString();
}

export function parseAndNormalizeUrl(rawUrl: string): URL {
  const trimmedUrl = rawUrl.trim();

  if (!trimmedUrl) {
    throw new UrlSafetyError(
      "That link doesn't look valid. Try pasting the full recipe URL.",
      "INVALID_URL",
    );
  }

  if (trimmedUrl.length > MAX_IMPORT_URL_LENGTH) {
    throw new UrlSafetyError(
      "That link is too long. Paste a shorter recipe URL.",
      "URL_TOO_LONG",
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmedUrl);
  } catch {
    throw new UrlSafetyError(
      "That link doesn't look valid. Try pasting the full recipe URL.",
      "INVALID_URL",
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UrlSafetyError(
      "Only http and https recipe links are supported.",
      "UNSUPPORTED_PROTOCOL",
    );
  }

  if (!parsed.hostname) {
    throw new UrlSafetyError(
      "That link doesn't look valid. Try pasting the full recipe URL.",
      "INVALID_URL",
    );
  }

  if (parsed.username || parsed.password) {
    throw new UrlSafetyError("That link type is not supported for import.", "UNSAFE_URL");
  }

  parsed.hash = "";

  return parsed;
}

export async function assertSafeHostname(hostname: string): Promise<void> {
  const normalizedHost = hostname.trim().toLowerCase();

  if (!normalizedHost) {
    throw new UrlSafetyError(
      "That link doesn't look valid. Try pasting the full recipe URL.",
      "INVALID_URL",
    );
  }

  if (isBlockedHostname(normalizedHost)) {
    throw new UrlSafetyError("That link points to a private network and can't be imported.", "UNSAFE_URL");
  }

  const directIpVersion = net.isIP(normalizedHost);

  if (directIpVersion > 0 && isPrivateIp(normalizedHost)) {
    throw new UrlSafetyError("That link points to a private network and can't be imported.", "UNSAFE_URL");
  }

  if (directIpVersion > 0) {
    return;
  }

  let resolvedAddresses: Array<{ address: string; family: number }>;

  try {
    resolvedAddresses = await dns.lookup(normalizedHost, {
      all: true,
      verbatim: true,
    });
  } catch {
    throw new UrlSafetyError("We couldn't verify that website address. Please try another link.", "UNSAFE_URL");
  }

  if (resolvedAddresses.length === 0) {
    throw new UrlSafetyError("We couldn't verify that website address. Please try another link.", "UNSAFE_URL");
  }

  if (resolvedAddresses.some((resolved) => isPrivateIp(resolved.address))) {
    throw new UrlSafetyError("That link points to a private network and can't be imported.", "UNSAFE_URL");
  }
}

function isBlockedHostname(hostname: string) {
  if (hostname === "localhost") {
    return true;
  }

  if (hostname.endsWith(".")) {
    return true;
  }

  return BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

function isPrivateIp(address: string) {
  const ipVersion = net.isIP(address);

  if (ipVersion === 4) {
    return isPrivateIpv4(address);
  }

  if (ipVersion === 6) {
    return isPrivateIpv6(address);
  }

  return true;
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map((part) => Number.parseInt(part, 10));

  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part < 0 || part > 255)) {
    return true;
  }

  const [first, second] = parts;

  if (first === 0 || first === 10 || first === 127) {
    return true;
  }

  if (first === 169 && second === 254) {
    return true;
  }

  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  if (first === 192 && second === 168) {
    return true;
  }

  if (first === 100 && second >= 64 && second <= 127) {
    return true;
  }

  if (first === 198 && (second === 18 || second === 19)) {
    return true;
  }

  return first >= 224;
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();

  if (normalized === "::" || normalized === "::1") {
    return true;
  }

  if (normalized.startsWith("fe80:")) {
    return true;
  }

  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  if (normalized.startsWith("::ffff:")) {
    const mappedIpv4 = normalized.slice(7);
    if (net.isIP(mappedIpv4) === 4) {
      return isPrivateIpv4(mappedIpv4);
    }
  }

  return false;
}
