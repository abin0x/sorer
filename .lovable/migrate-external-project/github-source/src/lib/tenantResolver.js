/**
 * Hostname → tenant resolver.
 *
 * Subdomain conventions:
 *   michiganjaguars.clubrudder.com  → club slug "michigan-jaguars"
 *   liverpoolmichigan.clubrudder.com → club slug "liverpool-michigan"
 *   clubrudder.com / www.clubrudder.com / *.base44.app / localhost → system domain (no single club)
 *
 * System users (system_owner, system_admin, is_super_admin) live on the system domain.
 * Club users are redirected to their own club's subdomain.
 */

const CLUBRUDDER_ROOT = "clubrudder.com";

// Explicit subdomain-prefix → club slug map (subdomains have no dashes; slugs do).
const SUBDOMAIN_TO_SLUG = {
  michiganjaguars: "michigan-jaguars",
  liverpoolmichigan: "liverpool-michigan",
};

export function getHostname() {
  if (typeof window === "undefined") return "";
  return (window.location.hostname || "").toLowerCase();
}

/** True for the platform/system domain (clubrudder.com, preview, localhost). */
export function isSystemDomain(hostname = getHostname()) {
  if (!hostname) return true;
  if (hostname === "clubrudder.com" || hostname === "www.clubrudder.com") return true;
  if (hostname.endsWith(".base44.app")) return true;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  return false;
}

/** True only on a real *.clubrudder.com domain (used to gate redirect logic). */
export function isClubrudderDomain(hostname = getHostname()) {
  return hostname === "clubrudder.com" || hostname.endsWith(".clubrudder.com");
}

/** Returns the club slug for the current hostname, or null on the system domain. */
export function getClubSlugFromHostname(hostname = getHostname()) {
  if (isSystemDomain(hostname)) return null;
  if (hostname.endsWith("." + CLUBRUDDER_ROOT)) {
    const sub = hostname.slice(0, -(CLUBRUDDER_ROOT.length + 1));
    if (sub && sub !== "www") return SUBDOMAIN_TO_SLUG[sub] || sub;
  }
  return null;
}

/** Build the full subdomain URL for a club slug (e.g. "michigan-jaguars" → https://michiganjaguars.clubrudder.com). */
export function getSubdomainUrl(slug) {
  if (!slug) return null;
  const sub = slug.replace(/-/g, "");
  return `https://${sub}.${CLUBRUDDER_ROOT}`;
}

export const SYSTEM_BRAND = {
  club_name: "Club Rudder",
  club_tagline: "Multi-Club Operations Platform",
  logo_url: "",
  primary_color: "#4f46e5",
  accent_color: "#0ea5e9",
};