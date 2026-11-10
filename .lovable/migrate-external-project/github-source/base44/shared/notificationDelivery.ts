// Shared backend delivery-resolution for expense notifications.
// Ports the quiet-hours + preset logic from src/lib/quietHours.js so backend
// functions (expense-notify, digest flush, reminders) can decide push/badge/digest
// without importing frontend code.

function toMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function getCurrentTimeInZone(timeZone: string) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now).reduce((acc: any, p) => { acc[p.type] = p.value; return acc; }, {} as any);
  const hour = parseInt(parts.hour, 10) % 24;
  const minute = parseInt(parts.minute, 10);
  return { weekday: parts.weekday as string, minutesOfDay: hour * 60 + minute };
}

/** True if "now" falls inside the user's configured quiet hours window. */
export function isInQuietHours(quietHours: any): boolean {
  if (!quietHours?.enabled) return false;
  const tz = quietHours.timezone || 'America/New_York';
  const { weekday, minutesOfDay } = getCurrentTimeInZone(tz);
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  const start = toMinutes(isWeekend ? (quietHours.weekend_start || quietHours.weekday_start) : quietHours.weekday_start);
  const end = toMinutes(isWeekend ? (quietHours.weekend_end || quietHours.weekday_end) : quietHours.weekday_end);
  if (start === end) return false;
  if (start < end) return minutesOfDay >= start && minutesOfDay < end;
  return minutesOfDay >= start || minutesOfDay < end;
}

/**
 * Decide how an expense notification should be delivered to a recipient.
 * Expense notifications have no channel/mute concept, so this is a simplified
 * version of the Beacon resolveDelivery.
 *
 * @param prefs  NotificationPreference record (or null → defaults)
 * @param opts.forceDigest  true for approver "submitted" notices (always batch)
 * @returns 'push' | 'badge' | 'digest'
 */
export function resolveExpenseDelivery(prefs: any, opts: { forceDigest?: boolean } = {}): 'push' | 'badge' | 'digest' {
  if (opts.forceDigest) return 'digest';
  const quiet = isInQuietHours(prefs?.quiet_hours);
  if (quiet) return 'digest';
  const preset = prefs?.preset || 'balanced';
  return preset === 'essentials' ? 'badge' : 'push';
}

const APPROVER_ROLES = ['admin', 'master_admin', 'club_director', 'club_admin', 'bookkeeper'];

/** Return the approver-role users for a club (service-role call). */
export async function getApproverUsers(base44: any, clubId: string) {
  const clubUsers = await base44.asServiceRole.entities.User.filter({ club_id: clubId }).catch(() => []);
  return clubUsers.filter((u: any) => APPROVER_ROLES.includes(u.custom_role) || u.role === 'admin');
}

/** Load (or create) a user's NotificationPreference row. */
export async function getNotificationPrefs(base44: any, userId: string) {
  if (!userId) return null;
  const rows = await base44.asServiceRole.entities.NotificationPreference.filter({ user_id: userId }).catch(() => []);
  return rows?.[0] || null;
}

/** Load (or seed) the per-club ExpenseNotificationSettings. */
export async function getExpenseSettings(base44: any, clubId: string) {
  if (!clubId) return null;
  const rows = await base44.asServiceRole.entities.ExpenseNotificationSettings.filter({ club_id: clubId }).catch(() => []);
  if (rows?.[0]) return rows[0];
  // Seed defaults on first access.
  try {
    const created = await base44.asServiceRole.entities.ExpenseNotificationSettings.create({ club_id: clubId });
    return created;
  } catch {
    return null;
  }
}