// @ts-nocheck
// Shared "one invite" logic: used by the system-owner Invite club flow AND the
// public Create your club form, so both produce exactly the same tenant + email.
import { sendBrandedEmail } from './resendEmail.ts';
import { logAudit } from './auditLog.ts';

export const DEFAULT_MODULES = {
  registration: true, payments: true, messaging: true, scheduling: true,
  tryouts: true, player_dev: true, facilities: true, tournaments: true, merchandise: false,
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const genToken = () => crypto.randomUUID();
export const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

function appUrl() {
  return (process.env.WIX_CHECKOUT_APP_URL || 'https://club-rudder-os.base44.app').replace(/\/$/, '');
}

async function uniqueSlug(svc, base) {
  const root = (base || 'club').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'club';
  let slug = root;
  for (let i = 0; i < 6; i++) {
    const hit = await svc.entities.Club.filter({ slug });
    if (!hit.length) return slug;
    slug = `${root}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return slug;
}

async function sendInviteEmail(base44, { to, adminName, clubName, specialist, token }) {
  const url = `${appUrl()}/accept-invite?invite=${encodeURIComponent(token)}`;
  const first = esc((adminName || '').split(' ')[0] || 'there');
  await sendBrandedEmail(base44.asServiceRole, {
    to,
    subject: `Your ClubRudder club is ready, ${(adminName || '').split(' ')[0] || 'there'}`,
    html: `
      <p style="font-size:15px;color:#334155;">Hi ${first},</p>
      <p style="font-size:15px;color:#334155;line-height:1.7;">
        <strong>${esc(clubName)}</strong> is set up on ClubRudder. One click takes you into your Setup Journey,
        a short guided path from bringing in your data to running your season.
      </p>
      <a href="${url}" style="display:inline-block;background:#399F7D;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">Start your Setup Journey</a>
      <p style="font-size:14px;color:#64748b;">Create your account (email or Google) and you land directly in your journey. You can save and come back any time, on any device.</p>
      ${specialist ? `<p style="font-size:14px;color:#64748b;">${esc(specialist)} from our team is assigned to help with your data migration.</p>` : ''}
    `,
  });
}

/**
 * Creates the tenant (status Invited), its journey, the admin invitation, and emails the link.
 * origin: 'system_owner' (inviter = user) or 'self_serve' (public form, inviter = null).
 */
export async function createClubInvite(base44, o) {
  const svc = base44.asServiceRole;
  const email = String(o.admin_email || '').trim().toLowerCase();
  const clubName = String(o.club_name || '').trim().slice(0, 120);
  const adminName = String(o.admin_name || '').trim().slice(0, 120);
  if (!clubName || !isValidEmail(email)) throw new Error('Club name and a valid admin email are required');

  if (o.origin === 'self_serve') {
    // Same person asking twice gets the same invite re-sent, never a second tenant.
    const pending = (await svc.entities.ClubInvitation.filter({ email, status: 'pending', role: 'club_admin' }))[0];
    if (pending) {
      const club = (await svc.entities.Club.filter({ id: pending.club_id }))[0];
      if (club?.tenant_status === 'invited') {
        await sendInviteEmail(base44, { to: email, adminName, clubName: club.name, specialist: '', token: pending.token });
        return { club, token: pending.token, resent: true };
      }
    }
  }

  let maxPlayers = 50, maxTeams = 5;
  try {
    const plan = (await svc.entities.SubscriptionPlan.filter({ tier: o.plan_tier || 'starter', is_active: true }))[0];
    if (plan) { maxPlayers = plan.max_players ?? maxPlayers; maxTeams = plan.max_teams ?? maxTeams; }
  } catch (e) { /* defaults */ }

  const inviter = o.inviter || null;
  const club = await svc.entities.Club.create({
    name: clubName,
    slug: await uniqueSlug(svc, o.slug || clubName),
    club_type: 'live',
    plan_tier: o.plan_tier || 'starter',
    status: 'trialing',
    tenant_status: 'invited',
    max_players: maxPlayers,
    max_branches: o.max_branches || 1,
    max_teams: maxTeams,
    assigned_specialist_name: o.specialist_name || '',
    source_system: o.source_system || '',
    admin_name: adminName,
    primary_contact_name: adminName,
    primary_contact_email: email,
    enabled_modules: o.enabled_modules || DEFAULT_MODULES,
    onboarded_by_user_id: inviter?.id || '',
    is_active: true,
  });

  await svc.entities.ClubSetupProgress.create({ club_id: club.id });
  await svc.entities.OnboardingJourney.create({
    club_id: club.id, club_name: club.name, status: 'active', current_stage: 'A', steps: {},
    source_system: o.source_system || '', specialist_name: o.specialist_name || '',
    invited_via: o.origin === 'self_serve' ? 'self_serve' : 'system_owner',
  });

  // Activate the club core and enabled modules so the admin has access
  // immediately on first login — before they even accept the invitation.
  const enabledMap = o.enabled_modules || DEFAULT_MODULES;
  const activeKeys = new Set(['club_nexus', 'communication', 'kanban']);
  if (enabledMap.payments || enabledMap.merchandise) activeKeys.add('payments');
  if (enabledMap.player_dev) activeKeys.add('development');
  if (enabledMap.facilities || enabledMap.scheduling) activeKeys.add('facilities');
  if (enabledMap.tournaments) activeKeys.add('tournaments');
  await svc.entities.TenantModule.bulkCreate(
    [...activeKeys].map(key => ({ club_id: club.id, module_key: key, status: 'active', admin_enabled: true }))
  );

  const token = genToken();
  const invitation = await svc.entities.ClubInvitation.create({
    club_id: club.id, club_name: club.name, token, email, invitee_name: adminName,
    role: 'club_admin', role_label: 'Club Admin', intended_roles: ['club_admin'],
    invited_by_name: inviter?.full_name || inviter?.email || 'Self-serve sign-up',
    invited_by_email: inviter?.email || '', status: 'pending',
  });

  let emailSent = true;
  try {
    await sendInviteEmail(base44, { to: email, adminName, clubName: club.name, specialist: o.specialist_name, token });
    await svc.entities.ClubInvitation.update(invitation.id, { sent_date: new Date().toISOString(), delivery_status: 'sent' });
  } catch (err) {
    emailSent = false;
    console.error('createClubInvite: email failed', err);
    await svc.entities.ClubInvitation.update(invitation.id, { last_error: String(err?.message || err) });
  }

  await logAudit(base44, {
    club_id: club.id, user: inviter, action: 'club_invited', entity_type: 'Club', entity_id: club.id,
    metadata: { origin: o.origin, admin_email: email, plan_tier: club.plan_tier, source_system: o.source_system || '', specialist: o.specialist_name || '', email_sent: emailSent },
  });
  return { club, token, invitationId: invitation.id, emailSent };
}