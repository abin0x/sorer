// Access control + audit logging + settings helpers for the Outreach module.
// All functions here are server-side only, imported by backend functions.

/** Returns 404 (not 403) for non-system_owner users to hide the module's existence. */
export async function requireSystemOwner(base44) {
  try {
    const user = await base44.auth.me();
    if (!user) return { user: null, error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
    const isOwner = user.system_role === 'system_owner' || user.is_super_admin === true;
    if (!isOwner) return { user: null, error: Response.json({ error: 'Not Found' }, { status: 404 }) };
    return { user, error: null };
  } catch (e) {
    return { user: null, error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
}

export async function logAudit(base44, user, action, entityType, entityId, diff) {
  try {
    await base44.asServiceRole.entities.OutreachAuditLog.create({
      actor_id: user?.id || '',
      actor_email: user?.email || '',
      action,
      entity_type: entityType || '',
      entity_id: entityId || '',
      diff: diff || {},
    });
  } catch (e) {
    console.error('Outreach audit log failed:', e);
  }
}

export async function getSettings(base44) {
  const rows = await base44.asServiceRole.entities.OutreachSettings.filter({ config_key: 'default' });
  return rows?.[0] || null;
}

export async function ensureSettings(base44) {
  let settings = await getSettings(base44);
  if (!settings) {
    settings = await base44.asServiceRole.entities.OutreachSettings.create({
      config_key: 'default',
      from_name: 'ClubRudder Team',
      from_address: 'team@mail.clubrudder.com',
      physical_address: 'ClubRudder\n123 Main St, Suite 100\nAnn Arbor, MI 48104',
      daily_send_limit: 100,
      warmup_mode: true,
      notify_on_reply: true,
      open_tracking_enabled: true,
      click_tracking_enabled: true,
      domain_verified: false,
      suppression_list: [],
    });
  }
  return settings;
}

export function maskApiKey(key) {
  if (!key || key.length < 8) return '';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

export function isSuppressed(email, settings) {
  if (!email || !settings?.suppression_list) return false;
  return settings.suppression_list.some(e => e.toLowerCase() === email.toLowerCase());
}

export async function addToSuppression(base44, email, reason) {
  const settings = await ensureSettings(base44);
  if (isSuppressed(email, settings)) return settings;
  const updated = await base44.asServiceRole.entities.OutreachSettings.update(settings.id, {
    suppression_list: [...(settings.suppression_list || []), email.toLowerCase()],
  });
  return updated;
}

export function sanitizeSettings(settings) {
  if (!settings) return null;
  return {
    ...settings,
    resend_api_key: maskApiKey(settings.resend_api_key),
  };
}

/** Calculate today's warmup-adjusted send limit. */
export function getTodaySendLimit(settings) {
  const limit = settings?.daily_send_limit || 100;
  if (!settings?.warmup_mode) return limit;
  if (!settings.warmup_started_at) return Math.min(20, limit);
  const daysSinceStart = Math.floor((Date.now() - new Date(settings.warmup_started_at).getTime()) / 86400000);
  const warmupLimit = Math.min(20 + daysSinceStart * 20, limit);
  return Math.max(20, warmupLimit);
}