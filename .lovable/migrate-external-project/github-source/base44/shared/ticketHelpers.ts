// Shared helpers for the support ticket system.
// Used by submit-ticket, reply-ticket, ticket-sla-check, ticket-auto-close,
// and ticket-tenant-context backend functions.

/** True if the user is a system owner, admin, support agent, or platform admin. */
export function isSystemAgent(user) {
  if (!user) return false;
  const sr = user.system_role;
  if (sr === 'system_owner' || sr === 'system_admin' || sr === 'system_support') return true;
  if (user.role === 'admin' || user.is_super_admin === true) return true;
  return false;
}

/** True if the user is a club_admin or club_director for their club. */
export function isClubAdmin(user) {
  const r = user?.custom_role;
  return r === 'club_admin' || r === 'club_director';
}

/** Generate the next sequential ticket number for a club: TKT-00001, TKT-00002, etc. */
export async function generateTicketNumber(db, clubId) {
  const count = await db.Ticket.count({ club_id: clubId }).catch(() => 0);
  const seq = (count || 0) + 1;
  // Pad to 5 digits; if collision happens, the caller can retry.
  return `TKT-${String(seq).padStart(5, '0')}`;
}

/**
 * Find the SLA policy that best matches a club.
 * 1. Club-specific policy matching the club's plan tier.
 * 2. Club-specific default policy.
 * 3. Global policy matching the plan tier.
 * 4. Global default policy.
 * 5. Built-in fallback.
 */
export async function getMatchingSlaPolicy(db, clubId, planTier) {
  const policies = await db.SLAPolicy.filter({ is_active: true }).catch(() => []);

  // 1. Club + plan tier
  let policy = policies.find(p => p.club_id === clubId && p.plan_tier === planTier);
  // 2. Club default
  if (!policy) policy = policies.find(p => p.club_id === clubId && p.is_default);
  // 3. Global + plan tier
  if (!policy) policy = policies.find(p => (!p.club_id || p.club_id === '') && p.plan_tier === planTier);
  // 4. Global default
  if (!policy) policy = policies.find(p => (!p.club_id || p.club_id === '') && p.is_default);
  // 5. Any active policy
  if (!policy && policies.length > 0) policy = policies[0];

  // 6. Built-in fallback
  if (!policy) {
    return {
      id: null,
      name: 'Built-in Fallback',
      priority_config: {
        P1: { response_hours: 1, resolution_hours: 4 },
        P2: { response_hours: 4, resolution_hours: 24 },
        P3: { response_hours: 8, resolution_hours: 72 },
        P4: { response_hours: 24, resolution_hours: 168 },
      },
    };
  }
  return policy;
}

/** Compute SLA response and resolution deadlines from a policy and priority. */
export function computeSlaDeadlines(policy, priority, now = new Date()) {
  const config = policy.priority_config?.[priority] || policy.priority_config?.P3 || {};
  const respHrs = config.response_hours ?? 8;
  const resHrs = config.resolution_hours ?? 72;
  return {
    sla_response_deadline: new Date(now.getTime() + respHrs * 3600_000).toISOString(),
    sla_resolution_deadline: new Date(now.getTime() + resHrs * 3600_000).toISOString(),
  };
}

/**
 * Compute SLA progress as a percentage (0-100).
 * Paused tickets use sla_paused_at as the reference point.
 * Returns { pct, breached, responsePct, resolutionPct }.
 */
export function computeSlaProgress(ticket, now = new Date()) {
  const created = new Date(ticket.created_date).getTime();
  const paused = ticket.sla_paused_at ? new Date(ticket.sla_paused_at).getTime() : null;
  const ref = paused || now.getTime();
  const elapsed = ref - created - (ticket.sla_total_paused_seconds || 0) * 1000;

  const respDl = ticket.sla_response_deadline ? new Date(ticket.sla_response_deadline).getTime() : null;
  const resDl = ticket.sla_resolution_deadline ? new Date(ticket.sla_resolution_deadline).getTime() : null;

  let responsePct = 0;
  if (respDl) responsePct = Math.min(100, (elapsed / (respDl - created)) * 100);

  let resolutionPct = 0;
  let breached = false;
  if (resDl) {
    resolutionPct = Math.min(100, (elapsed / (resDl - created)) * 100);
    if (elapsed >= resDl - created) breached = true;
  }

  return { pct: resolutionPct, breached, responsePct, resolutionPct };
}

/** Format a role label for display. */
export function roleLabel(user) {
  if (user?.system_role) return user.system_role.replace('system_', '').replace('_', ' ');
  return user?.custom_role?.replace(/_/g, ' ') || user?.role || 'user';
}

/** Parse the User-Agent string into a compact device/browser summary. */
export function parseDeviceInfo(userAgent) {
  if (!userAgent) return { browser: 'unknown', os: 'unknown', platform: 'unknown' };
  let browser = 'unknown';
  if (/edg/i.test(userAgent)) browser = 'Edge';
  else if (/chrome|crios/i.test(userAgent)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent)) browser = 'Safari';

  let os = 'unknown';
  if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/mac os|iphone|ipad/i.test(userAgent)) os = 'iOS/macOS';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/linux/i.test(userAgent)) os = 'Linux';

  let platform = 'desktop';
  if (/mobile|android|iphone/i.test(userAgent)) platform = 'mobile';
  else if (/ipad|tablet/i.test(userAgent)) platform = 'tablet';

  return { browser, os, platform };
}

/** Default SLA policies to seed. */
export const DEFAULT_SLA_POLICIES = [
  {
    name: 'Global Default SLA',
    plan_tier: 'default',
    is_default: true,
    is_active: true,
    club_id: '',
    priority_config: {
      P1: { response_hours: 1, resolution_hours: 4 },
      P2: { response_hours: 4, resolution_hours: 24 },
      P3: { response_hours: 8, resolution_hours: 72 },
      P4: { response_hours: 24, resolution_hours: 168 },
    },
  },
  {
    name: 'Enterprise SLA',
    plan_tier: 'enterprise',
    is_default: false,
    is_active: true,
    club_id: '',
    priority_config: {
      P1: { response_hours: 0.5, resolution_hours: 2 },
      P2: { response_hours: 2, resolution_hours: 8 },
      P3: { response_hours: 4, resolution_hours: 24 },
      P4: { response_hours: 8, resolution_hours: 48 },
    },
  },
];

/** Default macros to seed. */
export const DEFAULT_MACROS = [
  {
    name: 'Greeting + Acknowledgment',
    description: 'Initial response acknowledging the ticket',
    category: 'greeting',
    body_template: 'Hi {{customer_name}},\n\nThank you for reaching out about "{{subject}}" ({{ticket_number}}). I\'ve reviewed your request and I\'m looking into this now. I\'ll get back to you shortly with an update.\n\nBest regards,\n{{agent_name}}',
    variables: ['ticket_number', 'customer_name', 'club_name', 'agent_name', 'subject'],
    is_active: true,
    club_id: '',
  },
  {
    name: 'Request More Info',
    description: 'Ask the customer for additional details',
    category: 'info_request',
    body_template: 'Hi {{customer_name}},\n\nI need a bit more information to help with {{ticket_number}}. Could you please provide:\n\n1. Any error messages you\'re seeing (exact text if possible)\n2. The steps you took before the issue occurred\n3. A screenshot if you have one\n\nOnce I have these details I\'ll be able to dig in further.\n\nBest regards,\n{{agent_name}}',
    variables: ['ticket_number', 'customer_name', 'agent_name'],
    status_change: 'pending_customer',
    is_active: true,
    club_id: '',
  },
  {
    name: 'Resolution — Fixed',
    description: 'Mark the ticket as resolved with a fix',
    category: 'resolution',
    body_template: 'Hi {{customer_name}},\n\nGood news — I\'ve resolved the issue with {{ticket_number}}. Here\'s what was done:\n\n{{resolution_summary}}\n\nIf you\'re still experiencing the problem or have any questions, just reply to this message and the ticket will reopen.\n\nBest regards,\n{{agent_name}}',
    variables: ['ticket_number', 'customer_name', 'agent_name', 'resolution_summary'],
    status_change: 'resolved',
    is_active: true,
    club_id: '',
  },
  {
    name: 'Escalation Notice',
    description: 'Notify the customer that the ticket is escalated',
    category: 'escalation',
    body_template: 'Hi {{customer_name}},\n\nYour ticket {{ticket_number}} has been escalated to our senior team for further investigation. You\'ll receive an update from them soon. Thank you for your patience.\n\nBest regards,\n{{agent_name}}',
    variables: ['ticket_number', 'customer_name', 'agent_name'],
    status_change: 'escalated',
    is_active: true,
    club_id: '',
  },
];