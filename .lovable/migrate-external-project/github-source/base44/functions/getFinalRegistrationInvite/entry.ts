// Public read for the Final Registration portal — anonymous parents/guardians
// open this link from their invite email with no app login, so it must bypass
// RLS via the service role. Read-only: returns only what the portal needs to render.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const { inviteId } = await req.json().catch(() => ({}));
    if (!inviteId) {
      return Response.json({ error: 'Missing inviteId' }, { status: 400 });
    }

    const invite = await svc.entities.TryoutFinalRegistration.get(inviteId).catch(() => null);
    if (!invite) {
      return Response.json({ error: 'Invite not found' }, { status: 404 });
    }

    const team = invite.team_id ? await svc.entities.Team.get(invite.team_id).catch(() => null) : null;

    return Response.json({ invite, team });
  } catch (error) {
    console.error('getFinalRegistrationInvite error:', error);
    return Response.json({ error: error.message || 'Failed to load invite' }, { status: 500 });
  }
}