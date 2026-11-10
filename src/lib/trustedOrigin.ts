// Only the app's own addresses may be used for return links, redirects and emailed links,
// so a caller can never point a payment, OAuth or email link at an outside site.
const FALLBACK = "https://clubrudder.com";
const EXACT = new Set(["clubrudder.com", "www.clubrudder.com", "team-trunk-hq.lovable.app"]);
const PROJECT_ID = "5f94a8b0-2d03-41c1-aaf2-8460581a2fba";

export function isTrustedOrigin(value: unknown): boolean {
  if (typeof value !== "string" || !value) return false;
  let u: URL;
  try { u = new URL(value); } catch { return false; }
  if (u.pathname !== "/" && u.pathname !== "") return false;
  if (u.protocol === "http:") return u.hostname === "localhost";
  if (u.protocol !== "https:") return false;
  const h = u.hostname.toLowerCase();
  return EXACT.has(h) || (h.endsWith(".lovable.app") && h.includes(PROJECT_ID)) || (h.endsWith(".lovableproject.com") && h.includes(PROJECT_ID));
}

export function trustedOrigin(value: unknown): string {
  return isTrustedOrigin(value) ? new URL(value as string).origin : FALLBACK;
}
