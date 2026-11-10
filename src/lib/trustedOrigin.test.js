import { describe, it, expect } from "bun:test";
import { isTrustedOrigin, trustedOrigin } from "./trustedOrigin";

describe("trustedOrigin", () => {
  it("accepts the app's own domains", () => {
    expect(isTrustedOrigin("https://clubrudder.com")).toBe(true);
    expect(isTrustedOrigin("https://id-preview--5f94a8b0-2d03-41c1-aaf2-8460581a2fba.lovable.app")).toBe(true);
    expect(isTrustedOrigin("http://localhost:8080")).toBe(true);
  });
  it("rejects outside sites and falls back to clubrudder.com", () => {
    expect(isTrustedOrigin("https://evil.com")).toBe(false);
    expect(isTrustedOrigin("https://other-app.lovable.app")).toBe(false);
    expect(isTrustedOrigin("https://clubrudder.com.evil.com")).toBe(false);
    expect(trustedOrigin("https://evil.com")).toBe("https://clubrudder.com");
  });
});
