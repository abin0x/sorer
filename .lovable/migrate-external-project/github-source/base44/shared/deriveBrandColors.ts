/**
 * Tenant brand color derivation — shared server-side logic.
 *
 * Computes auto-derived color tokens (tints, shades, on-color, ring) from a
 * tenant's primary brand color. Called by the derive-brand-colors backend
 * function when a system owner saves a club's branding.
 *
 * All outputs are space-separated RGB channels (e.g. "80 72 229") ready to
 * inject as CSS custom properties: `--brand-500: 80 72 229;`
 *
 * Rules (from the three-layer color architecture):
 * - --brand-on is #FFFFFF if luminance < 0.45, otherwise #16181D (never grey).
 * - If the color fails 3:1 contrast against both black and white, auto-shift
 *   lightness until it passes with white. The `shifted` flag is set so the UI
 *   can surface a notice.
 * - --brand-50 (6% mix white), --brand-100 (12% mix white),
 *   --brand-600 (darken 12%), --brand-700 (darken 25%), --brand-ring (brand
 *   at 35% alpha — alpha applied in CSS via rgb(var(--brand-ring) / 0.35)).
 */

/** Parse a hex color string to {r, g, b}. Returns null on invalid input. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** WCAG relative luminance (0–1). */
export function relativeLuminance(r: number, g: number, b: number): number {
  const toLin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

/** WCAG contrast ratio between two luminance values (1–21). */
export function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Mix a color toward white by `amount` (0–1). */
function mixWithWhite(r: number, g: number, b: number, amount: number) {
  return {
    r: Math.round(r + (255 - r) * amount),
    g: Math.round(g + (255 - g) * amount),
    b: Math.round(b + (255 - b) * amount),
  };
}

/** Darken a color by `amount` (0–1). */
function darken(r: number, g: number, b: number, amount: number) {
  return {
    r: Math.max(0, Math.round(r * (1 - amount))),
    g: Math.max(0, Math.round(g * (1 - amount))),
    b: Math.max(0, Math.round(b * (1 - amount))),
  };
}

const ON_DARK = { r: 22, g: 24, b: 29 };    // #16181D
const ON_WHITE = { r: 255, g: 255, b: 255 }; // #FFFFFF

export interface DerivedBrandColors {
  brand500: string;
  brandOn: string;
  brand50: string;
  brand100: string;
  brand600: string;
  brand700: string;
  brandRing: string;
  shifted: boolean;
}

/**
 * Derive all brand color tokens from a hex primary color.
 * Returns null if the hex is invalid.
 */
export function deriveBrandColors(hex: string): DerivedBrandColors | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  let { r, g, b } = rgb;

  // Check 3:1 contrast against both white and dark text
  const L = relativeLuminance(r, g, b);
  const contrastVsWhite = contrastRatio(L, 1.0);
  const contrastVsDark = contrastRatio(L, relativeLuminance(ON_DARK.r, ON_DARK.g, ON_DARK.b));

  let shifted = false;
  if (contrastVsWhite < 3 && contrastVsDark < 3) {
    // Auto-shift: darken until 3:1 with white is met
    let attempts = 0;
    while (contrastRatio(relativeLuminance(r, g, b), 1.0) < 3 && attempts < 30) {
      r = Math.max(0, r - 8);
      g = Math.max(0, g - 8);
      b = Math.max(0, b - 8);
      attempts++;
      if (r === 0 && g === 0 && b === 0) break;
    }
    shifted = true;
  }

  // Determine on-color based on (possibly shifted) luminance
  const finalL = relativeLuminance(r, g, b);
  const on = finalL < 0.45 ? ON_WHITE : ON_DARK;

  // Derive tints and shades
  const brand50 = mixWithWhite(r, g, b, 0.06);
  const brand100 = mixWithWhite(r, g, b, 0.12);
  const brand600 = darken(r, g, b, 0.12);
  const brand700 = darken(r, g, b, 0.25);

  return {
    brand500: `${r} ${g} ${b}`,
    brandOn: `${on.r} ${on.g} ${on.b}`,
    brand50: `${brand50.r} ${brand50.g} ${brand50.b}`,
    brand100: `${brand100.r} ${brand100.g} ${brand100.b}`,
    brand600: `${brand600.r} ${brand600.g} ${brand600.b}`,
    brand700: `${brand700.r} ${brand700.g} ${brand700.b}`,
    brandRing: `${r} ${g} ${b}`,
    shifted,
  };
}