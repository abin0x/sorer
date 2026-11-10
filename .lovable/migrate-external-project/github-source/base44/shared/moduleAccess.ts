/**
 * Module access control — shared server-side logic.
 *
 * Used by has-module, module-webhook, module-reconcile, and any backend
 * function that needs to verify a tenant has access to a module.
 *
 * The client-side mirror lives in src/lib/moduleAccess.js (base44/ cannot
 * be imported from the frontend bundle).
 */

export const canonicalModuleKey = (key: string) => ({ player_development: 'development', facility_management: 'facilities', recruiting: 'club_nexus', calendar: 'communication' }[key] || key);

export function tenantModuleHasAccess(club: any, modules: any[], key: string): boolean {
  key = canonicalModuleKey(key);
  const find = (k: string) => modules.find(m => m.module_key === k) || modules.find(m => canonicalModuleKey(m.module_key) === k);
  const core = find('club_nexus');
  const basePaid = club?.status === 'active' && club?.subscription_status === 'active';
  const baseTrial = club?.status === 'trialing' && club?.trial_ends_at && new Date() < new Date(club.trial_ends_at);
  const coreAccess = core ? moduleHasAccess(core) : !!(basePaid || baseTrial);
  if (key === 'club_nexus') return coreAccess;
  if (!coreAccess) return false;
  const mod = find(key);
  return mod ? moduleHasAccess(mod) : key === 'communication';
}

export type ModuleStatus =
  | "pending_payment"
  | "trialing"
  | "active"
  | "past_due"
  | "canceling"
  | "suspended"
  | "expired"
  | "complimentary";

export interface TenantModuleRecord {
  status: ModuleStatus;
  module_key?: string;
  admin_enabled?: boolean;
  grace_ends_at?: string | null;
  access_ends_at?: string | null;
  complimentary_expires_at?: string | null;
}

/**
 * Core access decision. Returns true if the tenant has access to this module
 * right now, based on status and relevant date fields.
 *
 *  - active         → always true
 *  - trialing       → always true (trial window enforced by Stripe)
 *  - past_due       → true if now < grace_ends_at (grace not yet expired)
 *  - canceling      → true if now < access_ends_at (period not yet ended)
 *  - complimentary  → true if complimentary_expires_at is null (permanent) or now < expires_at
 *  - pending_payment, suspended, expired → false
 */
export function moduleHasAccess(mod: TenantModuleRecord, now: Date = new Date()): boolean {
  if (!mod || mod.admin_enabled === false) return false;
  const nowMs = now.getTime();
  switch (mod.status) {
    case "active":
      return true;
    case "trialing":
      return true;
    case "past_due":
      if (!mod.grace_ends_at) return true; // no grace set = still in grace
      return nowMs < new Date(mod.grace_ends_at).getTime();
    case "canceling":
      if (!mod.access_ends_at) return false;
      return nowMs < new Date(mod.access_ends_at).getTime();
    case "complimentary":
      if (!mod.complimentary_expires_at) return true; // null = permanent
      return nowMs < new Date(mod.complimentary_expires_at).getTime();
    case "pending_payment":
    case "suspended":
    case "expired":
      return false;
    default:
      return false;
  }
}

/**
 * Map a Stripe subscription status to our internal module status.
 */
export function stripeStatusToModuleStatus(stripeStatus: string): ModuleStatus {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
      return "suspended";
    case "incomplete":
    case "incomplete_expired":
      return "pending_payment";
    case "paused":
      return "suspended";
    default:
      return "pending_payment";
  }
}

/**
 * Get the active BillingSettings (or defaults if none configured).
 */
export async function getBillingSettings(svc: any) {
  const rows = await svc.entities.BillingSettings.filter({ is_active: true }, "-created_date", 1).catch(() => []);
  const s = rows?.[0];
  return {
    grace_period_days: s?.grace_period_days ?? 7,
    trial_period_days: s?.trial_period_days ?? 14,
    alert_email: s?.alert_email ?? null,
    reconcile_enabled: s?.reconcile_enabled ?? true,
  };
}

/**
 * Compute the grace end date from now + grace period.
 */
export function computeGraceEndsAt(gracePeriodDays: number, now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() + gracePeriodDays);
  return d.toISOString();
}

/**
 * Log an entitlement change to EntitlementEvent.
 */
export async function logEntitlementEvent(
  svc: any,
  params: {
    club_id: string;
    module_key: string;
    action: string;
    from_status?: string;
    to_status?: string;
    reason?: string;
    actor: string;
    metadata?: Record<string, any>;
  }
) {
  await svc.entities.EntitlementEvent.create({
    club_id: params.club_id,
    module_key: params.module_key,
    action: params.action,
    from_status: params.from_status || null,
    to_status: params.to_status || null,
    reason: params.reason || null,
    actor: params.actor,
    metadata: params.metadata || {},
  }).catch((e: any) => console.error("logEntitlementEvent error:", e));
}