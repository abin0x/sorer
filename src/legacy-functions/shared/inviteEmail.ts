// @ts-nocheck
// Shared helper: builds and sends a single club-invitation email via Resend,
// and creates/updates the corresponding ClubInvitation record + UserRoles pending grant.
// Used by inviteClubMember and any flow that generates invitations (e.g. parent onboarding
// inviting a co-guardian).

import { resolveEditableEmail } from './editableEmailTemplate.ts';

export const ROLE_LABELS: Record<string, string> = {
  club_director: 'Club Director',
  club_admin: 'Club Admin',
  branch_director: 'Branch Director',
  branch_admin: 'Branch Admin',
  bookkeeper: 'Bookkeeper',
  project_manager: 'Project Manager',
  coach: 'Coach',
  team_manager: 'Team Manager',
  facility_manager: 'Facility Manager',
  platform_director: 'Platform Director',
  parent_guardian: 'Parent/Guardian',
  player: 'Player',
};

// Roles that require a dedicated onboarding data-collection step before becoming active.
export const ONBOARDING_ROLES = ['parent_guardian', 'coach', 'branch_director', 'club_admin', 'club_director', 'bookkeeper', 'platform_director'];

function buildEmailHtml(clubName: string, roleLabel: string, invitedByName: string, greetingName: string, signupUrl: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #399F7D, #2D5F4F); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited to ${clubName}</h1>
      </div>
      <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; color: #1e293b;">Hi ${greetingName},</p>
        <p style="font-size: 16px; color: #475569; line-height: 1.6;">
          <strong>${invitedByName}</strong> has invited you to join <strong>${clubName}</strong> on Club Rudder OS.
        </p>
        <div style="background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #0369a1;">
            <strong>Your role upon validation:</strong> ${roleLabel}
          </p>
        </div>
        <p style="font-size: 16px; color: #475569; line-height: 1.6;">
          Click the button below to set up your account. Once you validate your email, you'll be granted access as a <strong>${roleLabel}</strong>.
        </p>
        <a href="${signupUrl}"
           style="display: inline-block; background-color: #399F7D; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 16px 0; font-size: 16px; font-weight: 600;">
          Accept Invitation
        </a>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          ${signupUrl}
        </p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
        <p style="color: #94a3b8; font-size: 12px;">
          This invitation was sent by ${invitedByName}. If you weren't expecting this invitation, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;
}

function genToken(): string {
  return (globalThis as any).crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Sends one invitation email and creates/updates the ClubInvitation record.
 * Returns { success, invitationId, token, error }.
 * Caller is responsible for the Resend preflight check (key exists + works) before calling this in a loop.
 */
export async function sendInvitationEmail(base44: any, opts: {
  clubId: string;
  clubName: string;
  fromAddress: string;
  appUrl: string;
  resendKey: string;
  email: string;
  fullName?: string;
  role: string;
  intendedRoles?: string[];
  accessLevel?: string;
  invitedByName: string;
  invitedByEmail: string;
  existingInvitation?: any;
  reminder?: boolean;
}) {
  const { clubId, clubName, fromAddress, appUrl, resendKey, invitedByName, invitedByEmail } = opts;
  const email = String(opts.email || '').trim().toLowerCase();
  const fullName = String(opts.fullName || '').trim();
  const role = String(opts.role || '').trim();
  const roleLabel = ROLE_LABELS[role] || role;
  const intendedRoles = opts.intendedRoles?.length ? opts.intendedRoles : [role];

  try {
    const existing = await base44.asServiceRole.entities.ClubInvitation.filter({ club_id: clubId, email });
    const pending = opts.existingInvitation || existing.find((i: any) => i.status === 'pending');
    const token = pending?.token || genToken();

    const invitationData = {
      club_id: clubId,
      club_name: clubName,
      token,
      email,
      invitee_name: fullName,
      role,
      role_label: roleLabel,
      intended_roles: intendedRoles,
      invited_by_name: invitedByName,
      invited_by_email: invitedByEmail,
      access_level: opts.accessLevel === 'limited' ? 'limited' : 'full',
      status: 'pending',
      last_error: '',
    };

    const invitation = pending
      ? await base44.asServiceRole.entities.ClubInvitation.update(pending.id, invitationData)
      : await base44.asServiceRole.entities.ClubInvitation.create(invitationData);

    const signupUrl = `${appUrl.replace(/\/$/, '')}/accept-invite?invite=${encodeURIComponent(token)}`;
    const rendered = await resolveEditableEmail(base44, clubId, 'staff_invitation', {
      subject: "You're invited to join {{club_name}} as a {{role_label}}",
      body: buildEmailHtml('{{club_name}}', '{{role_label}}', '{{invited_by_name}}', '{{full_name}}', '{{action_url}}'),
    }, { club_name: clubName, role_label: roleLabel, invited_by_name: invitedByName, full_name: fullName || 'there', action_url: signupUrl });
    if (!rendered.body.includes(signupUrl)) throw new Error('The invitation template must include {{action_url}} so recipients can accept it.');
    const emailHtml = rendered.body;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject: rendered.subject,
        html: emailHtml,
      }),
    });

    if (!emailRes.ok) {
      const errData = await emailRes.json().catch(() => ({}));
      const errMsg = errData?.message || 'Failed to send email';
      await base44.asServiceRole.entities.ClubInvitation.update(invitation.id, { last_error: errMsg });
      return { success: false, error: errMsg, email_setup_required: [401, 403].includes(emailRes.status) || /api.?key|domain.*verif|testing emails|permission|restricted/i.test(errMsg), email, full_name: fullName, role, role_label: roleLabel, invitationId: invitation.id };
    }

    const delivery = await emailRes.json();
    await base44.asServiceRole.entities.ClubInvitation.update(invitation.id, {
      sent_date: new Date().toISOString(), resend_email_id: delivery.id,
      delivery_status: 'sent', last_error: '',
      ...(opts.reminder ? { reminder_count: (pending?.reminder_count || 0) + 1, last_reminded_date: new Date().toISOString() } : {}),
    });
    // The club invitation already contains the registration/acceptance link.
    // Do not send a second platform invitation with unrelated app branding.

    return { success: true, email, full_name: fullName, role, role_label: roleLabel, invitationId: invitation.id, token };
  } catch (e: any) {
    console.error('sendInvitationEmail error', e?.message);
    return { success: false, error: e.message || 'Unexpected error', email, full_name: fullName, role, role_label: roleLabel };
  }
}