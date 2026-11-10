import { ROLES, isSystemUser } from "@/lib/rbac";

/**
 * Who may set up tryouts. Branch directors/admins run tryouts for their own
 * branch; club-level roles and system users see the whole club.
 */
const MANAGE_ROLES = [
  ROLES.MASTER_ADMIN,
  ROLES.ADMIN,
  ROLES.CLUB_DIRECTOR,
  ROLES.CLUB_ADMIN,
  ROLES.BRANCH_DIRECTOR,
  ROLES.BRANCH_ADMIN,
];

const BRANCH_SCOPED_ROLES = [ROLES.BRANCH_DIRECTOR, ROLES.BRANCH_ADMIN];

export function canManageTryouts(user) {
  if (!user) return false;
  if (isSystemUser(user)) return true;
  const role = user.custom_role || user.role;
  return MANAGE_ROLES.includes(role);
}

/**
 * The single branch a branch-scoped admin is limited to, or null for
 * club-level admins (who see every branch). Mirrors the branch resolution the
 * branch dashboards already use (location_id, falling back to branch_id).
 */
export function tryoutBranchScope(user) {
  if (!user) return null;
  const role = user.custom_role || user.role;
  if (!BRANCH_SCOPED_ROLES.includes(role)) return null;
  return user.location_id || user.branch_id || null;
}

/** A plan belongs to a branch when that branch is one of the plan's branches. */
export function planInBranch(plan, branchId) {
  if (!branchId) return true;
  return (plan?.location_ids || []).includes(branchId);
}

export function filterPlansForUser(plans, user) {
  const branchId = tryoutBranchScope(user);
  if (!branchId) return plans;
  return plans.filter((p) => planInBranch(p, branchId));
}

/** True when the signed-in admin may edit this specific plan. */
export function canManagePlan(plan, user) {
  return canManageTryouts(user) && planInBranch(plan, tryoutBranchScope(user));
}