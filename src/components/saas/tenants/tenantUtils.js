export const RESERVED_SUBDOMAINS = [
  "www", "api", "admin", "app", "dashboard", "static",
  "mail", "blog", "help", "status", "docs", "cdn",
];

export function slugify(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidHex(hex) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex || "");
}

// Checks a subdomain against the reserved list and every other club's slug.
export function checkSubdomain(slug, clubs, excludeId) {
  if (!slug) return { available: false, reason: "Subdomain is required" };
  if (RESERVED_SUBDOMAINS.includes(slug)) {
    return { available: false, reason: `"${slug}" is a reserved word` };
  }
  const taken = clubs.find((c) => c.slug === slug && c.id !== excludeId);
  if (taken) {
    return { available: false, reason: `Already taken by "${taken.name}"` };
  }
  return { available: true, reason: null };
}