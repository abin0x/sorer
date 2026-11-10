// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { ROLE_LABELS, ONBOARDING_ROLES } from '../../shared/inviteEmail.ts';

// Called during onboarding (first login) to apply a pending ClubInvitation to the
// current user — sets their custom_role + club_id, and creates a UserRoles grant
// for every intended role (pending if it needs a data-collection onboarding step,
// active immediately otherwise).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let token: string | null = null;
    try {
      const body = await req.json();
      token = body?.token || null;
    } catch {
      // no body — fine, fall back to email matching
    }

    const email = String(user.email || '').trim().toLowerCase();
    const service = base44.asServiceRole.entities;
    let invitations;
    if (token) {
      invitations = await service.ClubInvitation.filter({ token });
      const invite = invitations[0];
      if (!invite || !['pending', 'accepted'].includes(invite.status)) return Response.json({ error: 'Invitation is no longer available.' }, { status: 404 });
      if (String(invite.email).toLowerCase() !== email) return Response.json({ error: `Sign in with the email address this invitation was sent to: ${invite.email}` }, { status: 403 });
    } else {
      invitations = await service.ClubInvitation.filter({ email, status: 'pending' });
    }
    if (!invitations.length) return Response.json({ applied: false });

    // Preserve a legacy membership before selecting a new invited club.
    if (user.club_id && user.custom_role) {
      const old = await service.UserRoles.filter({ user_id: user.id, club_id: user.club_id, role: user.custom_role });
      if (!old.length) await service.UserRoles.create({ user_id: user.id, user_email: user.email, user_name: user.full_name || '', club_id: user.club_id, role: user.custom_role, role_label: ROLE_LABELS[user.custom_role] || user.custom_role, status: 'active' });
    }
    const clubIds = [...new Set(invitations.map(i => i.club_id).filter(Boolean))];
    const clubsRaw = await service.Club.filter({ id: { $in: clubIds } });
    const clubs = Array.isArray(clubsRaw) ? clubsRaw : (clubsRaw.items || []);
    const clubExists = (id: string) => clubs.some(c => c.id === id);
    // Revoke any invitations whose club was deleted so they never trip up a future visit.
    const orphaned = invitations.filter(i => i.club_id && !clubExists(i.club_id));
    if (orphaned.length) {
      await Promise.allSettled(orphaned.map(i => service.ClubInvitation.update(i.id, { status: 'revoked', last_error: 'Club no longer exists' }).catch(() => {})));
    }
    const validInvitations = invitations.filter(i => !i.club_id || clubExists(i.club_id));
    if (!validInvitations.length) return Response.json({ error: 'The invited club no longer exists. Ask the sender for a new invitation.' }, { status: 404 });
    const invitation = validInvitations.find(i => i.club_id === user.club_id) || validInvitations[0];
    for (const invite of validInvitations) {
      const intendedRoles = invite.intended_roles?.length ? invite.intended_roles : [invite.role];
      for (const role of intendedRoles) {
        const existing = await service.UserRoles.filter({ user_id: user.id, club_id: invite.club_id, role });
        if (!existing.length) await service.UserRoles.create({
          user_id: user.id, user_email: user.email, user_name: user.full_name || invite.invitee_name || '',
          club_id: invite.club_id, role, role_label: ROLE_LABELS[role] || role,
          status: ONBOARDING_ROLES.includes(role) ? 'pending' : 'active', source_invitation_id: invite.id,
        });
        if (role === 'coach') {
          const coaches = await service.Coach.filter({ club_id: invite.club_id, email: user.email });
          if (!coaches.length) {
            const [first_name, ...last] = (user.full_name || invite.invitee_name || 'Coach').split(' ');
            await service.Coach.create({ club_id: invite.club_id, email: user.email, first_name, last_name: last.join(' '), status: 'active' });
          }
        }
      }
      // Mark accepted only AFTER all memberships exist, so interrupted calls can resume.
      await service.ClubInvitation.update(invite.id, { status: 'accepted', accepted_by_user_id: user.id, accepted_date: invite.accepted_date || new Date().toISOString() });
    }
    const roles = invitation.intended_roles?.length ? invitation.intended_roles : [invitation.role];
    const grants = await service.UserRoles.filter({ user_id: user.id, club_id: invitation.club_id });
    const pendingOnboarding = grants.filter(r => r.status === 'pending').map(r => r.role);
    await base44.auth.updateMe({ club_id: invitation.club_id, custom_role: roles[0], onboarding_completed: true, role_onboarding_completed: !pendingOnboarding.length,
      ...(invitation.club_id !== user.club_id ? { branch_id: null, location_id: null, branch: null } : {}) });
    return Response.json({ applied: true, roles, pendingOnboarding, club_id: invitation.club_id, club_name: invitation.club_name });
  } catch (error) {
    console.error('applyPendingInvitation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}