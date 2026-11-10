/**
 * WCAG contrast utilities.
 *
 * ensureAccessiblePair() takes a hex background, picks the best foreground
 * (white or black) by relative luminance, and — if the pair still falls below
 * the WCAG AA threshold (4.5:1) — darkens the background in OKLCH color space
 * until it passes. Returns the adjusted background hex and the chosen
 * foreground hex.
 *
 * The lighter original color should be kept for subtle accents where text
 * contrast doesn't apply — only filled surfaces (buttons, chips, badges)
 * should use the returned `bg`.
 */

function hexToRgb(hex) {
  if (!hex) return null;
  let h = String(hex).replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function clamp255(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function rgbToHex(r, g, b) {
  const c = (v) => clamp255(v).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** "R G B" channel string for CSS rgb(var(--token)) consumers. */
export function hexToRgbChannels(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return `${rgb.r} ${rgb.g} ${rgb.b}`;
}

function srgbToLinear(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v) {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(1, c));
}

/** WCAG relative luminance (0–1) for a hex color. */
export function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return (
    0.2126 * srgbToLinear(rgb.r) +
    0.7152 * srgbToLinear(rgb.g) +
    0.0722 * srgbToLinear(rgb.b)
  );
}

/** WCAG contrast ratio between two hex colors. */
export function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** Pick white or black — whichever has the higher contrast against `hex`. */
export function bestForeground(hex) {
  const bgLum = relativeLuminance(hex);
  const whiteContrast = (1.0 + 0.05) / (bgLum + 0.05);
  const blackContrast = (bgLum + 0.05) / (0.0 + 0.05);
  return whiteContrast >= blackContrast ? "#ffffff" : "#000000";
}

// ---- OKLCH conversion (perceptually-uniform darkening) ----

function linearRgbToOklab(r, g, b) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717663 * m_ - 0.8086757660 * s_,
  };
}

function oklabToLinearRgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  };
}

function hexToOklch(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  const lab = linearRgbToOklab(r, g, b);
  const C = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let H = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L: lab.L, C, H };
}

function oklchToHex(L, C, H) {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  const rgb = oklabToLinearRgb(L, a, b);
  return rgbToHex(
    linearToSrgb(rgb.r) * 255,
    linearToSrgb(rgb.g) * 255,
    linearToSrgb(rgb.b) * 255
  );
}

/**
 * Given a background hex, return { fg, bg } where:
 *  - fg is "#ffffff" or "#000000" (best contrast)
 *  - bg is the original hex, or a darkened (OKLCH) variant if the best
 *    fg still doesn't reach `minRatio` (default 4.5 = WCAG AA).
 *
 * The original lighter color should be kept for subtle accents — only
 * filled surfaces (buttons, chips, badges) should use the returned `bg`.
 */
export function ensureAccessiblePair(hex, minRatio = 4.5) {
  if (!hex) return { fg: "#ffffff", bg: "#000000" };
  let bg = hex;
  let fg = bestForeground(bg);
  const tone = hexToOklch(bg);
  // Saturated mid-tones (teal, cyan, green, orange) look muddy with black
  // text: darken them and use white instead.
  const forceWhite = tone && tone.C >= 0.08 && tone.L >= 0.45 && tone.L <= 0.82;
  if (forceWhite) fg = "#ffffff";
  let attempts = 0;
  while (contrastRatio(fg, bg) < minRatio && attempts < 80) {
    const oklch = hexToOklch(bg);
    if (!oklch) break;
    const newL = Math.max(0, oklch.L - 0.015);
    bg = oklchToHex(newL, oklch.C, oklch.H);
    fg = forceWhite ? "#ffffff" : bestForeground(bg);
    attempts++;
    if (newL <= 0) break;
  }
  return { fg, bg };
}

/**
 * Preserve a brand hue for text while guaranteeing contrast on the page.
 * Light pages darken bright colors; dark pages lighten deep colors.
 */
export function ensureAccessibleText(hex, page = "#ffffff", minRatio = 4.5) {
  let text = hex;
  const direction = relativeLuminance(page) > 0.45 ? -1 : 1;
  let attempts = 0;
  while (contrastRatio(text, page) < minRatio && attempts < 80) {
    const oklch = hexToOklch(text);
    if (!oklch) break;
    const nextL = Math.max(0, Math.min(1, oklch.L + direction * 0.015));
    text = oklchToHex(nextL, oklch.C, oklch.H);
    attempts += 1;
    if (nextL <= 0 || nextL >= 1) break;
  }
  return text;
}

/** Darken a hex by a fraction (0–1) in OKLCH — for hover states. */
export function darkenOklch(hex, fraction = 0.08) {
  const oklch = hexToOklch(hex);
  if (!oklch) return hex;
  return oklchToHex(Math.max(0, oklch.L - fraction), oklch.C, oklch.H);
}

export { hexToRgb, rgbToHex, hexToOklch, oklchToHex };