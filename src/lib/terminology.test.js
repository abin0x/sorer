import { describe, it, expect } from "vitest";
import { mergeTerminology, term, positionOptions } from "./terminology.js";

describe("club terminology", () => {
  it("falls back to defaults for blank values", () => {
    const t = mergeTerminology({ terms: { branch: { singular: "  ", plural: "" } } });
    expect(term(t, "branch")).toBe("Branch");
    expect(term(t, "branch", true)).toBe("Branches");
  });
  it("uses a club's custom names", () => {
    const t = mergeTerminology({ terms: { branch: { singular: "Campus", plural: "Campuses" } }, scale: { 5: "Elite" } });
    expect(term(t, "branch", true)).toBe("Campuses");
    expect(t.scale[5]).toBe("Elite");
    expect(t.scale[1]).toBe("Poor");
  });
  it("renames positions but keeps numbering", () => {
    const t = mergeTerminology({ positions: { goalkeeper: "Keeper" } });
    expect(positionOptions(t)[0].label).toBe("1 - Keeper");
  });
  it("keeps default criteria when the custom list is empty", () => {
    expect(mergeTerminology({ criteria: [] }).criteria).toHaveLength(4);
  });
});
