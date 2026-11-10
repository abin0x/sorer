import { ClipboardCheck } from "lucide-react";
import { ROLES, getSystemRole, SYSTEM_ROLES } from "./rbac.js";

export const tryoutDashboardNavItem = {
  title: "Tryout Dashboard",
  url: "/tryoutdashboard",
  icon: ClipboardCheck,
  showFor: [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.PLATFORM_DIRECTOR, ROLES.PROJECT_MANAGER, ROLES.COACH, ROLES.TRYOUT_LEAD],
};

export function canShowNavigationGroup(group, user, superAdmin) {
  if (group.ownerOnly && getSystemRole(user) !== SYSTEM_ROLES.SYSTEM_OWNER) return false;
  if (group.superOnly && !superAdmin) return false;
  return true;
}

export function consoleNavigationUrl(tab, search = "") {
  const params = new URLSearchParams(search);
  params.set("tab", tab);
  return `/saasadmin?${params.toString()}`;
}

export function isNavigationItemActive(item, pathname, search = "") {
  const path = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  const target = item.url.split("?")[0].toLowerCase();
  if (path !== target) return false;
  const params = new URLSearchParams(search);
  if (item.saasTab) return (params.get("tab") || "overview") === item.saasTab;
  const itemParams = new URLSearchParams(item.url.split("?")[1]);
  return [...itemParams].every(([key, value]) => params.get(key) === value);
}
// Collapse a parent nav item and its nested `children` into the entries the
// caller may see. If the parent itself is hidden, the first visible child is
// promoted so the section stays reachable. Returns null when nothing is visible.
export function resolveNavSection(item, isVisible) {
  const entries = [item, ...(item.children || [])].filter(isVisible);
  if (entries.length === 0) return null;
  const { children: _ignored, ...lead } = entries[0];
  return { ...lead, icon: item.icon, title: item.sectionTitle || lead.title, entries: entries.map(({ children: _c, ...e }) => e) };
}

export function isNavSectionActive(section, pathname, search = "") {
  return section.entries.some((entry) => isNavigationItemActive(entry, pathname, search));
}

// The section (with 2+ visible entries) that owns the current page, used for the page tab bar.
export function findActiveNavSection(groups, isVisible, pathname, search = "") {
  for (const group of groups) {
    for (const item of group.items) {
      const section = resolveNavSection(item, isVisible);
      if (section && section.entries.length > 1 && isNavSectionActive(section, pathname, search)) return section;
    }
  }
  return null;
}
