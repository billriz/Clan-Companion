import { describe, expect, it } from "vitest";

import {
  isPrivateOrUnsafeIp,
  UrlSafetyError,
  validateAndNormalizeExternalUrl,
} from "@/lib/recipes/import/url-safety";

describe("validateAndNormalizeExternalUrl", () => {
  it("accepts valid public http/https URLs", () => {
    const parsed = validateAndNormalizeExternalUrl("https://www.allrecipes.com/recipe/12345");

    expect(parsed.protocol).toBe("https:");
    expect(parsed.hostname).toBe("www.allrecipes.com");
  });

  it("rejects unsupported protocols", () => {
    expect(() => validateAndNormalizeExternalUrl("ftp://example.com/recipe")).toThrowError(
      UrlSafetyError,
    );
  });

  it("rejects localhost and loopback addresses", () => {
    expect(() => validateAndNormalizeExternalUrl("http://localhost:3000/recipe")).toThrowError(
      UrlSafetyError,
    );
    expect(() => validateAndNormalizeExternalUrl("http://127.0.0.1/recipe")).toThrowError(
      UrlSafetyError,
    );
    expect(() => validateAndNormalizeExternalUrl("http://[::1]/recipe")).toThrowError(
      UrlSafetyError,
    );
  });

  it("rejects private and internal hostnames", () => {
    expect(() => validateAndNormalizeExternalUrl("http://192.168.1.40/recipe")).toThrowError(
      UrlSafetyError,
    );
    expect(() => validateAndNormalizeExternalUrl("http://intranet/recipe")).toThrowError(
      UrlSafetyError,
    );
  });
});

describe("isPrivateOrUnsafeIp", () => {
  it("returns true for loopback/link-local/private ranges", () => {
    expect(isPrivateOrUnsafeIp("127.0.0.1")).toBe(true);
    expect(isPrivateOrUnsafeIp("10.1.2.3")).toBe(true);
    expect(isPrivateOrUnsafeIp("172.16.0.10")).toBe(true);
    expect(isPrivateOrUnsafeIp("192.168.1.4")).toBe(true);
    expect(isPrivateOrUnsafeIp("169.254.0.12")).toBe(true);
  });

  it("returns false for public IPv4 addresses", () => {
    expect(isPrivateOrUnsafeIp("8.8.8.8")).toBe(false);
    expect(isPrivateOrUnsafeIp("1.1.1.1")).toBe(false);
  });

  it("handles IPv6 safety rules", () => {
    expect(isPrivateOrUnsafeIp("::1")).toBe(true);
    expect(isPrivateOrUnsafeIp("fc00::1")).toBe(true);
    expect(isPrivateOrUnsafeIp("fd12:3456:789a::1")).toBe(true);
  });
});
