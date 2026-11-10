import { describe, it, expect } from "vitest";
import { resolveBrandLead } from "./tenantBranding";
describe("resolveBrandLead", () => {
  it("leads with the colorful secondary when primary is grey", () => {
    expect(resolveBrandLead("#8d8f91", "#45e3e5")).toEqual({ primary: "#45e3e5", secondary: "#8d8f91", swapped: true });
  });
  it("keeps a colorful primary", () => {
    expect(resolveBrandLead("#1d4ed8", "#45e3e5").swapped).toBe(false);
  });
  it("keeps grey when secondary is also grey", () => {
    expect(resolveBrandLead("#8d8f91", "#777777").swapped).toBe(false);
  });
});
