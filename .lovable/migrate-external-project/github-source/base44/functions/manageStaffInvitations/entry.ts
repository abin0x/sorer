import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getClubCredentials } from '../../shared/clubCredentials.ts';
import { sendInvitationEmail, ROLE_LABELS } from '../../shared/inviteEmail.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const systemUser = !!(user.role === 'admin' || user.system_role || user.is_super_admin);
    if (!systemUser && !['master_admin', 'admin', 'club_director', 'club_admin'].includes(user.custom_role)) return Response.json({ error: 'Only club administrators can manage staff invitations.' }, { status: 403 });
    const clubId = systemUser && body.club_id ? String(body.club_id) : user.club_id;
    if (!clubId) return Response.json({ error: 'Select a club first.' }, { status: 400 });
    const svc = base44.asServiceRole.entities;
    const action = body.action || 'list';
    if (action === 'list') {
      const rows = await svc.ClubInvitation.filter({ club_id: clubId, role: { $nin: ['parent_guardian', 'player'] } }, '-created_date', 500);
      const pending = rows.filter(i => i.status === 'pending' && i.resend_email_id && !i.received_date && !['bounced', 'failed'].includes(i.delivery_status)).slice(0, 20);
      const credentials = pending.length ? await getClubCredentials(base44, clubId) : null;
      if (credentials?.resend_api_key) {
        // Batch two requests per second to respect Resend's default rate limit.
        for (let offset = 0; offset < pending.length; offset += 2) {
          if (offset) await new Promise(resolve => setTimeout(resolve, 1100));
          await Promise.all(pending.slice(offset, offset + 2).map(async invitation => {
            try {
              const res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(invitation.resend_email_id)}`, { headers: { Authorization: `Bearer ${credentials.resend_api_key}` }, signal: AbortSignal.timeout(5000) });
              if (!res.ok) return;
              const email = await res.json();
              const state = email.last_event;
              if (!state || state === invitation.delivery_status) return;
              const patch = { delivery_status: state };
              if (['delivered', 'opened', 'clicked'].includes(state)) patch.received_date = new Date().toISOString();
              if (['bounced', 'failed'].includes(state)) patch.last_error = `Email ${state}. Check the recipient address before sending a reminder.`;
              await svc.ClubInvitation.update(invitation.id, patch);
              Object.assign(invitation, patch);
            } catch (e) { console.warn('Invitation delivery check:', e.message); }
          }));
        }
      }
      return Response.json({ invitations: rows.map(({ token, ...invitation }) => invitation) });
    }
    if (!['edit', 'delete', 'remind'].includes(action) || !body.invitation_id) return Response.json({ error: 'A valid action and invitation are required.' }, { status: 400 });
    const matches = await svc.ClubInvitation.filter({ id: String(body.invitation_id), club_id: clubId });
    const invitation = matches[0];
    if (!invitation || ['parent_guardian', 'player'].includes(invitation.role)) return Response.json({ error: 'Staff invitation not found.' }, { status: 404 });
    if (action === 'delete') {
      await svc.ClubInvitation.delete(invitation.id);
      return Response.json({ success: true });
    }
    if (invitation.status !== 'pending') return Response.json({ error: 'Only pending invitations can be edited or reminded. Accepted staff can be edited in the directory.' }, { status: 400 });
    if (action === 'edit') {
      const email = String(body.email || '').trim().toLowerCase();
      const name = String(body.invitee_name || '').trim();
      const role = String(body.role || '').trim();
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !ROLE_LABELS[role] || ['parent_guardian', 'player'].includes(role)) return Response.json({ error: 'Enter a name, valid email and staff role.' }, { status: 400 });
      if (!systemUser && ['club_admin', 'club_director'].includes(role) && role !== invitation.role) return Response.json({ error: 'Only platform staff can assign this role.' }, { status: 403 });
      const duplicate = await svc.ClubInvitation.filter({ club_id: clubId, email, status: 'pending' });
      if (duplicate.some(i => i.id !== invitation.id)) return Response.json({ error: 'A pending invitation already exists for this email.' }, { status: 409 });
      const changedEmail = email !== invitation.email;
      await svc.ClubInvitation.update(invitation.id, {
        email, invitee_name: name, role, role_label: ROLE_LABELS[role], intended_roles: role === invitation.role ? invitation.intended_roles : [role],
        ...(changedEmail ? { token: crypto.randomUUID(), sent_date: null, received_date: null, opened_date: null, resend_email_id: null, delivery_status: '', last_error: '', reminder_count: 0, last_reminded_date: null } : {}),
      });
      return Response.json({ success: true, email_changed: changedEmail });
    }
    const club = await svc.Club.get(clubId);
    const credentials = await getClubCredentials(base44, clubId);
    if (!credentials?.resend_api_key || club.resend_domain_status !== 'verified' || !club.resend_domain_name) return Response.json({ error: 'Configure a verified sending domain and Resend key for this club first.' }, { status: 400 });
    const result = await sendInvitationEmail(base44, {
      clubId, clubName: club.app_name || club.name,
      fromAddress: `${club.app_name || club.name} <invites@${club.resend_domain_name}>`,
      appUrl: req.headers.get('X-Base44-App-Url') || 'https://clubrudder.com',
      resendKey: credentials.resend_api_key, email: invitation.email,
      fullName: invitation.invitee_name, role: invitation.role,
      intendedRoles: invitation.intended_roles, accessLevel: invitation.access_level,
      invitedByName: invitation.invited_by_name || user.full_name || user.email,
      invitedByEmail: invitation.invited_by_email || user.email,
      existingInvitation: invitation, reminder: true,
    });
    if (!result.success) return Response.json({ error: result.error }, { status: 400 });
    return Response.json({ success: true });
  } catch (error) {
    console.error('manageStaffInvitations:', error);
    return Response.json({ error: error.message || 'Unable to manage invitations.' }, { status: 500 });
  }
}