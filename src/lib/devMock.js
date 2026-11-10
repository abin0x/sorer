// Dev-only role/club impersonator. Never active outside `vite dev`.
const KEY = "cr_dev_mock";

export const DEV_MOCK_ENABLED = import.meta.env.DEV;

export const MOCK_CLUBS = {
  "demo-fc": { id: "demo-fc", name: "Demo FC", slug: "demo-fc", status: "active" },
  "eclipse-select": { id: "eclipse-select", name: "Eclipse Select SC", slug: "eclipse-select", status: "active" },
};

export const MOCK_ROLES = {
  system_owner: { label: "System owner", role: "admin", is_super_admin: true, custom_role: "master_admin" },
  club_admin: { label: "Club admin", role: "user", custom_role: "club_admin" },
  coach: { label: "Coach", role: "user", custom_role: "coach" },
  parent: { label: "Parent", role: "user", custom_role: "parent_guardian" },
};

export function getDevMock() {
  if (!DEV_MOCK_ENABLED || typeof window === "undefined") return null;
  try {
    const m = JSON.parse(window.localStorage.getItem(KEY) || "null");
    if (!m || !MOCK_ROLES[m.role]) return null;
    const r = MOCK_ROLES[m.role];
    return {
      id: `mock-${m.role}`,
      email: `${m.role}@demo-fc.test`,
      full_name: `Mock ${r.label}`,
      role: r.role,
      custom_role: r.custom_role,
      is_super_admin: !!r.is_super_admin,
      club_id: m.club || "demo-fc",
      __mock: true,
    };
  } catch { return null; }
}

export function setDevMock(role, club = "demo-fc") {
  if (!DEV_MOCK_ENABLED) return;
  if (!role) window.localStorage.removeItem(KEY);
  else window.localStorage.setItem(KEY, JSON.stringify({ role, club }));
  window.location.reload();
}
