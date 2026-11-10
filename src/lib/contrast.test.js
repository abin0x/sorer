import { describe, expect, it } from "bun:test";
import { contrastRatio, ensureAccessiblePair, ensureAccessibleText } from "./contrast";
import { deriveBrandColorsClient } from "./tenantBranding";

describe("tenant brand contrast", () => {
  it.each(["#000000", "#ffffff", "#777777", "#ffff00", "#172554", "#e11d48", "#0ea5e9", "#123456"])(
    "keeps normal text at WCAG AA on %s",
    (color) => {
      const pair = ensureAccessiblePair(color);
      expect(contrastRatio(pair.bg, pair.fg)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("uses dark text on mid-gray only because that pair reaches AA", () => {
    const pair = ensureAccessiblePair("#777777");
    expect(pair.fg).toBe("#000000");
    expect(contrastRatio(pair.bg, pair.fg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(pair.bg, "#ffffff")).toBeLessThan(4.5);
  });

  it("adjusts brand text independently for light and dark page backgrounds", () => {
    const yellowOnLight = ensureAccessibleText("#facc15", "#ffffff");
    const navyOnDark = ensureAccessibleText("#172554", "#0f172a");
    expect(contrastRatio(yellowOnLight, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(navyOnDark, "#0f172a")).toBeGreaterThanOrEqual(4.5);
  });

  it("uses a readable legacy brand-on token for bright and dark club colors", () => {
    expect(deriveBrandColorsClient("#0ea5e9").brandOn).toBe("22 24 29");
    expect(deriveBrandColorsClient("#172554").brandOn).toBe("255 255 255");
  });

  it("holds AA across a deterministic cross-section of club colors", () => {
    for (let index = 0; index < 120; index += 1) {
      const color = `#${((index * 2654435761) >>> 0).toString(16).padStart(8, "0").slice(0, 6)}`;
      const pair = ensureAccessiblePair(color);
      expect(contrastRatio(pair.bg, pair.fg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

import { test as t2, expect as e2 } from "bun:test";
t2("saturated mid-tone teal gets darkened with white text", () => {
  const pair = ensureAccessiblePair("#14b8a6");
  e2(pair.fg).toBe("#ffffff");
  e2(contrastRatio(pair.fg, pair.bg)).toBeGreaterThanOrEqual(4.5);
});
