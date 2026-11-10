import { ROLE_LABELS } from "@/lib/rbac";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Resolve free text (role key or human label, any case) to a role key. */
export function resolveRole(raw, availableRoles) {
  if (!raw) return "";
  const norm = String(raw).trim().toLowerCase();
  const asKey = norm.replace(/\s+/g, "_");
  const byKey = availableRoles.find((r) => r === asKey);
  if (byKey) return byKey;
  const byLabel = availableRoles.find((r) => (ROLE_LABELS[r] || "").toLowerCase() === norm);
  return byLabel || "";
}

let idCounter = 0;
export function nextRowId() {
  idCounter += 1;
  return `row-${Date.now()}-${idCounter}`;
}

/** Parse pasted multi-line text into invite rows: "Name, email, role" per line (order-flexible). */
export function parsePastedLines(text, availableRoles) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    const parts = line.split(/[,\t;]+/).map((p) => p.trim()).filter(Boolean);
    let email = "";
    let full_name = "";
    let role = "";
    for (const part of parts) {
      if (!email && EMAIL_RE.test(part)) {
        email = part.toLowerCase();
        continue;
      }
      if (!role) {
        const resolved = resolveRole(part, availableRoles);
        if (resolved) {
          role = resolved;
          continue;
        }
      }
      if (!full_name) full_name = part;
    }
    return { id: nextRowId(), full_name, email, role };
  });
}