// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { logAudit } from '../../shared/auditLog.ts';
import { getClubCredentials } from '../../shared/clubCredentials.ts';
import { sendInvitationEmail, ROLE_LABELS } from '../../shared/inviteEmail.ts';

// Roles that require a system_user to invite — club_admin and club_director
// are privileged club-wide roles, so only platform staff can grant them.
const SYSTEM_ONLY_ROLES = ['club_admin', 'club_director'];

// Roles a club director/admin can invite without system_user access
const INVITABLE_ROLES = [
  'branch_director', 'branch_admin', 'bookkeeper', 'project_manager',
  'coach', 'team_manager', 'facility_manager', 'platform_director',
  'parent_guardian', 'player',
];
const ALL_ROLES = [...SYSTEM_ONLY_ROLES, ...INVITABLE_ROLES];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isSystemUser(user: any): boolean {
  return !!(user?.system_role || user?.is_super_admin === true || user?.role === 'admin');
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    // Normalize to a list of invitees — supports a single {email, role, full_name}
    // or bulk {invitees: [{email, role, full_name}, ...]}
    const rawList = Array.isArray(body.invitees) && body.invitees.length > 0
      ? body.invitees
      : (body.email ? [{ email: body.email, role: body.role, full_name: body.full_name }] : []);

    if (rawList.length === 0) {
      return Response.json({ error: 'At least one invitee (email + role) is required' }, { status: 400 });
    }

    const systemUser = isSystemUser(user);

    // Resolve the target club: a system user viewing a tenant passes an explicit
    // club_id; everyone else uses their own club_id. System users without a
    // club_id AND without an override cannot invite.
    if (systemUser && !body.club_id) {
      return Response.json({ error: 'Select the destination club before sending an invitation.' }, { status: 400 });
    }
    const targetClubId = systemUser ? String(body.club_id) : user.club_id;
    if (!targetClubId) {
      return Response.json({ error: 'Your user is not associated with a club.' }, { status: 400 });
    }

    const canConfigureEmail = systemUser || ['master_admin', 'admin', 'club_director', 'club_admin'].includes(user.custom_role);
    const club = await base44.entities.Club.get(targetClubId);
    const clubName = club?.app_name || club?.name || 'Club Rudder OS';
    const clubCred = await getClubCredentials(base44, targetClubId);
    const resendKey = clubCred?.resend_api_key;
    // The Resend sandbox cannot deliver invitations to arbitrary staff addresses.
    if (!resendKey || club?.resend_domain_status !== 'verified' || !club?.resend_domain_name) {
      return Response.json({
        error: 'Set up a Resend API key and verified sending domain for this club before sending invitations.',
        email_setup_required: true,
        can_configure_email: canConfigureEmail,
      }, { status: 400 });
    }
    const fromAddress = `${clubName} <invites@${club.resend_domain_name}>`;
    const appUrl = req.headers.get('X-Base44-App-Url') || 'https://clubrudder.com';

    const results: any[] = [];

    for (const raw of rawList) {
      const email = String(raw.email || '').trim().toLowerCase();
      const fullName = String(raw.full_name || '').trim();
      const role = String(raw.role || '').trim();
      const roleLabel = ROLE_LABELS[role] || role;

      if (!email || !EMAIL_RE.test(email)) {
        results.push({ email: raw.email || '', full_name: fullName, role, success: false, error: 'Invalid email address' });
        continue;
      }
      if (!ALL_ROLES.includes(role)) {
        results.push({ email, full_name: fullName, role, success: false, error: 'Invalid or missing role' });
        continue;
      }
      if (SYSTEM_ONLY_ROLES.includes(role) && !systemUser) {
        results.push({ email, full_name: fullName, role, role_label: roleLabel, success: false, error: 'Only a system user can invite Club Admin or Club Director' });
        continue;
      }

      const result = await sendInvitationEmail(base44, {
        clubId: targetClubId,
        clubName,
        fromAddress,
        appUrl,
        resendKey,
        email,
        fullName,
        role,
        invitedByName: user.full_name || user.email,
        invitedByEmail: user.email || '',
      });

      if (result.success) {
        await logAudit(base44, {
          club_id: targetClubId,
          user,
          action: 'user_invited',
          entity_type: 'ClubInvitation',
          entity_id: result.invitationId,
          metadata: { email, role, role_label: roleLabel },
        });
      }

      if (!result.success && result.email_setup_required) {
        result.can_configure_email = canConfigureEmail;
      }
      results.push(result);
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.length - sent;

    return Response.json({ success: true, results, sent, failed });
  } catch (error) {
    console.error('inviteClubMember error:', error);
    return Response.json({ error: error.message || 'Failed to send invitations' }, { status: 500 });
  }
}