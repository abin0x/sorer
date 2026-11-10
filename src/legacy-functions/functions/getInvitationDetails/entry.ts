// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();
    if (typeof token !== 'string' || token.length < 20) return Response.json({ error: 'Invalid invitation link.' }, { status: 400 });
    const rows = await base44.asServiceRole.entities.ClubInvitation.filter({ token });
    const invite = rows.find(i => ['pending', 'accepted'].includes(i.status));
    if (!invite) return Response.json({ error: 'This invitation is no longer available.' }, { status: 404 });
    if (!invite.opened_date) await base44.asServiceRole.entities.ClubInvitation.update(invite.id, { opened_date: new Date().toISOString() }).catch(() => {});
    const users = await base44.asServiceRole.entities.User.filter({ email: invite.email.toLowerCase() });
    return Response.json({ email: invite.email, club_name: invite.club_name, role_label: invite.role_label || invite.role, account_exists: users.some(u => u.is_verified !== false) });
  } catch (error) {
    console.error('getInvitationDetails:', error);
    return Response.json({ error: 'Unable to load your invitation.' }, { status: 500 });
  }
}