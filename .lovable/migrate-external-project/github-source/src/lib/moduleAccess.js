/**
 * Module access control — client-side logic.
 *
 * Mirror of base44/shared/moduleAccess.ts for the frontend bundle
 * (base44/ cannot be imported from frontend files).
 *
 * The authoritative check is the has-module backend function; this is
 * used for navigation gating and UI rendering where calling the backend
 * on every render would be too slow.
 */

export const MODULE_STATUSES = [
  "pending_payment",
  "trialing",
  "active",
  "past_due",
  "canceling",
  "suspended",
  "expired",
  "complimentary",
];

export const MODULE_STATUS_LABELS = {
  pending_payment: "Pending Payment",
  trialing: "Trialing",
  active: "Active",
  past_due: "Past Due",
  canceling: "Canceling",
  suspended: "Suspended",
  expired: "Expired",
  complimentary: "Complimentary",
};

export const MODULE_STATUS_COLORS = {
  pending_payment: "bg-slate-100 text-slate-600 border-slate-200",
  trialing: "bg-blue-100 text-blue-700 border-blue-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  past_due: "bg-amber-100 text-amber-700 border-amber-200",
  canceling: "bg-orange-100 text-orange-700 border-orange-200",
  suspended: "bg-red-100 text-red-700 border-red-200",
  expired: "bg-slate-200 text-slate-500 border-slate-300",
  complimentary: "bg-purple-100 text-purple-700 border-purple-200",
};

export const canonicalModuleKey = key => ({ player_development: 'development', facility_management: 'facilities', recruiting: 'club_nexus', calendar: 'communication' }[key] || key);

export function moduleRecord(modules, key) {
  key = canonicalModuleKey(key);
  return modules.find(m => m.module_key === key) || modules.find(m => canonicalModuleKey(m.module_key) === key);
}

export function baseSubscriptionHasAccess(club, now = new Date()) {
  if (!club || !['active', 'trialing'].includes(club.status)) return false;
  if (club.status === 'trialing') return !!club.trial_ends_at && now < new Date(club.trial_ends_at);
  return club.subscription_status === 'active';
}

export function tenantModuleHasAccess(club, modules, key) {
  key = canonicalModuleKey(key);
  const core = moduleRecord(modules, 'club_nexus');
  const coreAccess = core ? moduleHasAccess(core) : baseSubscriptionHasAccess(club);
  if (key === 'club_nexus') return coreAccess;
  if (!coreAccess) return false;
  const mod = moduleRecord(modules, key);
  return mod ? moduleHasAccess(mod) : key === 'communication';
}

export function moduleHasAccess(mod, now = new Date()) {
  if (!mod || mod.admin_enabled === false) return false;
  const nowMs = now.getTime();
  switch (mod.status) {
    case "active":
      return true;
    case "trialing":
      return true;
    case "past_due":
      if (!mod.grace_ends_at) return true;
      return nowMs < new Date(mod.grace_ends_at).getTime();
    case "canceling":
      if (!mod.access_ends_at) return false;
      return nowMs < new Date(mod.access_ends_at).getTime();
    case "complimentary":
      if (!mod.complimentary_expires_at) return true;
      return nowMs < new Date(mod.complimentary_expires_at).getTime();
    case "pending_payment":
    case "suspended":
    case "expired":
      return false;
    default:
      return false;
  }
}