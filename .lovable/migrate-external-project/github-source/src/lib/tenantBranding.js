/**
 * Multi-tenant branding utilities.
 *
 * The Club entity (logo_url, primary_color, secondary_color, app_name) is the
 * single source of truth for tenant branding — edited only by the system
 * owner in the System Console (SaaSAdmin → Tenants). Club admins/directors
 * no longer have a branding editor of their own.
 *
 * Tenant resolution reuses tenantResolver's hostname → club-slug mapping so
 * the cache key always matches what TenantBrandingProvider/TenantContext
 * resolve — "system" on the platform domain, the club slug otherwise.
 *
 * Branding is cached in localStorage so it can be applied synchronously
 * BEFORE React mounts — this eliminates the flash of default branding that
 * occurs when branding is fetched async on page reload.
 */

import { getHostname, isSystemDomain, getClubSlugFromHostname, SYSTEM_BRAND } from "@/lib/tenantResolver";
import { ensureAccessiblePair, darkenOklch, hexToRgbChannels } from "@/lib/contrast";

/** The Rudder app icon — white logo used inside a club-color square everywhere. */
export const RUDDER_LOGO_URL =
  "https://media.base44.com/images/public/690d4c6dccfb0f4e79c33a38/f27090daf_Rudder-white-logo.png";

/** Resolve the current tenant's slug ("system" on the platform domain). */
export function getTenantSlug(hostname = getHostname()) {
  if (isSystemDomain(hostname)) return "system";
  return getClubSlugFromHostname(hostname) || "system";
}

/** The default / fallback branding (system-level). */
export const DEFAULT_BRANDING = {
  tenantSlug: "system",
  appName: SYSTEM_BRAND.club_name,
  logoUrl: SYSTEM_BRAND.logo_url,
  primaryColor: SYSTEM_BRAND.primary_color,
  secondaryColor: SYSTEM_BRAND.accent_color,
};

// ---- localStorage cache ----

const CACHE_PREFIX = "tenant_branding_";

export function getCachedBranding(tenantSlug) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + tenantSlug);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedBranding(tenantSlug, branding) {
  try {
    localStorage.setItem(CACHE_PREFIX + tenantSlug, JSON.stringify(branding));
  } catch {
    /* ignore quota errors */
  }
}

// ---- DOM application ----

function deriveForeground(hex) {
  // Pick white or dark-slate text based on WCAG relative luminance contrast,
  // so buttons always have legible text regardless of the brand color.
  if (!hex) return "0 0% 100%";
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return "0 0% 100%";
  const toLin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = toLin(parseInt(h.slice(0, 2), 16));
  const g = toLin(parseInt(h.slice(2, 4), 16));
  const b = toLin(parseInt(h.slice(4, 6), 16));
  const Lbg = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // White text for typical saturated brand colors (indigo, green, blue, sky,
  // purple, red). Dark slate only for light backgrounds (amber, yellow, gold)
  // where dark text is clearly more legible.
  return Lbg < 0.4 ? "0 0% 100%" : "222 47% 11%";
}

/**
 * Client-side brand color derivation — mirrors the server-side deriveBrandColors
 * in base44/shared/deriveBrandColors.ts. Used as a fallback when the Club entity
 * doesn't have pre-computed derived_brand_colors, and for live admin preview.
 * Returns RGB channel strings or null.
 */
export function deriveBrandColorsClient(hex) {
  if (!hex) return null;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  let r = parseInt(h.slice(0, 2), 16);
  let g = parseInt(h.slice(2, 4), 16);
  let b = parseInt(h.slice(4, 6), 16);

  const toLin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const lum = (r, g, b) => 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
  const contrast = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  const L = lum(r, g, b);
  const darkL = lum(22, 24, 29);
  let shifted = false;
  if (contrast(L, 1.0) < 3 && contrast(L, darkL) < 3) {
    shifted = true;
    let attempts = 0;
    while (contrast(lum(r, g, b), 1.0) < 3 && attempts < 30) {
      r = Math.max(0, r - 8); g = Math.max(0, g - 8); b = Math.max(0, b - 8);
      attempts++;
      if (r === 0 && g === 0 && b === 0) break;
    }
  }

  const finalL = lum(r, g, b);
  const on = finalL < 0.45 ? "255 255 255" : "22 24 29";
  const mix = (v, amt) => Math.round(v + (255 - v) * amt);
  const dark = (v, amt) => Math.max(0, Math.round(v * (1 - amt)));

  return {
    brand500: `${r} ${g} ${b}`,
    brandOn: on,
    brand50: `${mix(r, 0.06)} ${mix(g, 0.06)} ${mix(b, 0.06)}`,
    brand100: `${mix(r, 0.12)} ${mix(g, 0.12)} ${mix(b, 0.12)}`,
    brand600: `${dark(r, 0.12)} ${dark(g, 0.12)} ${dark(b, 0.12)}`,
    brand700: `${dark(r, 0.25)} ${dark(g, 0.25)} ${dark(b, 0.25)}`,
    brandRing: `${r} ${g} ${b}`,
    shifted,
  };
}

function hexToHslChannels(hex) {
  if (!hex) return null;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let sat = 0;
  const light = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hue = (b - r) / d + 2; break;
      default: hue = (r - g) / d + 4;
    }
    hue /= 6;
  }
  return `${Math.round(hue * 360)} ${Math.round(sat * 100)}% ${Math.round(light * 100)}%`;
}

const COLOR_PROPS = [
  "--primary", "--primary-foreground", "--ring",
  "--sidebar-primary", "--sidebar-primary-foreground", "--sidebar-ring",
  "--chart-1", "--accent", "--accent-foreground", "--chart-2",
  "--brand-500", "--accent-500", "--brand-on", "--brand-50", "--brand-100",
  "--brand-600", "--brand-700", "--brand-ring",
];

/**
 * Inject branding as CSS custom properties on :root and update the
 * document title + favicon. Calling this with the cached branding before
 * React mounts prevents any flash of the wrong theme on page reload.
 */
export function applyBrandingToDOM(branding) {
  if (!branding) return;
  const root = document.documentElement;

  if (branding.primaryColor) {
    const hsl = hexToHslChannels(branding.primaryColor);
    if (hsl) {
      root.style.setProperty("--primary", hsl);
      root.style.setProperty("--ring", hsl);
      root.style.setProperty("--sidebar-primary", hsl);
      root.style.setProperty("--sidebar-ring", hsl);
      root.style.setProperty("--chart-1", hsl);
    }
    // WCAG-AA accessible pair for filled surfaces (buttons, chips, badges).
    // The helper picks white or black as the best foreground, then darkens
    // the background in OKLCH until the pair reaches 4.5:1. The lighter
    // original color is kept above as --primary / --brand-500 for subtle
    // accents, borders, and rings where text contrast doesn't apply.
    const pair = ensureAccessiblePair(branding.primaryColor);
    const fgHsl = hexToHslChannels(pair.fg);
    root.style.setProperty("--primary-foreground", fgHsl);
    root.style.setProperty("--sidebar-primary-foreground", fgHsl);
    root.style.setProperty("--action-primary", hexToRgbChannels(pair.bg));
    root.style.setProperty("--action-primary-text", hexToRgbChannels(pair.fg));
    root.style.setProperty("--action-primary-hover", hexToRgbChannels(darkenOklch(pair.bg, 0.06)));
  }

  if (branding.secondaryColor) {
    const pair = ensureAccessiblePair(branding.secondaryColor);
    root.style.setProperty("--accent", hexToHslChannels(pair.bg));
    root.style.setProperty("--accent-foreground", hexToHslChannels(pair.fg));
    root.style.setProperty("--chart-2", hexToHslChannels(branding.secondaryColor));
  }

  // ===== Layer 2: Tenant brand tokens (RGB channels) =====
  // Prefer pre-computed derived values from the Club entity; fall back to
  // client-side derivation for backward compat (clubs not yet re-saved).
  const primaryDerived = branding.derivedBrandColors?.primary
    || (branding.primaryColor ? deriveBrandColorsClient(branding.primaryColor) : null);
  if (primaryDerived) {
    root.style.setProperty("--brand-500", primaryDerived.brand500);
    root.style.setProperty("--brand-on", primaryDerived.brandOn);
    root.style.setProperty("--brand-50", primaryDerived.brand50);
    root.style.setProperty("--brand-100", primaryDerived.brand100);
    root.style.setProperty("--brand-600", primaryDerived.brand600);
    root.style.setProperty("--brand-700", primaryDerived.brand700);
    root.style.setProperty("--brand-ring", primaryDerived.brandRing);
  }

  const secondaryDerived = branding.derivedBrandColors?.secondary
    || (branding.secondaryColor ? deriveBrandColorsClient(branding.secondaryColor) : null);
  if (secondaryDerived) {
    root.style.setProperty("--accent-500", secondaryDerived.brand500);
  }

  if (branding.appName) {
    document.title = `${branding.appName} — Club Management`;
  }

  // Always use the Rudder app icon as the favicon so the browser tab
  // shows the consistent app brand regardless of which club is active.
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = RUDDER_LOGO_URL;
}

/** Clear all JS-injected branding overrides so stylesheet defaults take over. */
export function clearBrandingFromDOM() {
  const root = document.documentElement;
  COLOR_PROPS.forEach((k) => root.style.removeProperty(k));
}

/**
 * Read the cached branding for the current tenant and apply it immediately.
 * Call this in main.jsx BEFORE ReactDOM.createRoot().render() so the correct
 * theme is on the DOM before the first paint — no flash on reload.
 */
export function initBrandingFromCache() {
  const tenantSlug = getTenantSlug();
  const cached = getCachedBranding(tenantSlug);
  applyBrandingToDOM(cached || DEFAULT_BRANDING);
}