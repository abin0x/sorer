import { describe, it, expect } from "vitest";
import { isSystemDomain } from "./tenantResolver";

describe("isSystemDomain", () => {
  it("treats the preview domains as the platform domain", () => {
    expect(isSystemDomain("id-preview--abc.lovable.app")).toBe(true);
    expect(isSystemDomain("abc.lovableproject.com")).toBe(true);
  });
  it("treats club subdomains as tenant domains", () => {
    expect(isSystemDomain("michiganjaguars.clubrudder.com")).toBe(false);
  });
});
