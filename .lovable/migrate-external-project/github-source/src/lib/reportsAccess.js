import { ROLES, hasPermission } from "@/lib/rbac";

// Roles that should NOT see the Reports page at all.
const NO_ACCESS_ROLES = [ROLES.PARENT_GUARDIAN, ROLES.PLAYER];

// Roles allowed to see finance KPIs/charts (revenue, outstanding, overdue, expenses).
const FINANCE_ROLES = [
  ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN,
  ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.BOOKKEEPER,
];

// Roles allowed to see registration KPIs/charts (new registrations, event signups).
const REGISTRATION_ROLES = [
  ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN,
  ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.BOOKKEEPER,
];

// Roles allowed to see roster KPIs/charts (active players, roster fill).
const ROSTER_ROLES = [
  ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN,
  ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.COACH,
];

// Roles allowed to see the tryout funnel chart.
const TRYOUT_ROLES = [
  ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN,
  ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN, ROLES.COACH,
];

/** True if the user may open the Reports page at all. */
export function canAccessReports(user) {
  if (!user) return false;
  const role = user.custom_role || user.role;
  if (NO_ACCESS_ROLES.includes(role)) return false;
  if (user.is_super_admin || user.system_role) return true;
  return hasPermission(user, "reports:view");
}

/**
 * Returns the full access profile for the Reports page.
 * - category flags control which KPIs/charts render
 * - scope flags control how queries are filtered (club-wide vs branch vs team)
 */
export function getReportAccess(user) {
  const role = user?.custom_role || user?.role;
  const isSystem = !!user?.is_super_admin || !!user?.system_role || role === "admin";

  return {
    canSeeFinance: isSystem || FINANCE_ROLES.includes(role),
    canSeeRegistration: isSystem || REGISTRATION_ROLES.includes(role),
    canSeeRoster: isSystem || ROSTER_ROLES.includes(role),
    canSeeTryouts: isSystem || TRYOUT_ROLES.includes(role),
    canExport: isSystem || hasPermission(user, "reports:export"),
    isClubWide:
      isSystem ||
      [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BOOKKEEPER].includes(role),
    isBranchScoped: [ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN].includes(role),
    isTeamScoped: [ROLES.COACH, ROLES.TEAM_MANAGER].includes(role),
    role,
  };
}