// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { getClubQbConnection, findOrCreateClass } from '../../shared/quickbooksApi.ts';

const ADMIN_ROLES = ['master_admin', 'admin', 'club_director', 'club_admin', 'bookkeeper', 'project_manager'];

function canManage(user) {
  return user && (user.role === 'admin' || ADMIN_ROLES.includes(user.custom_role));
}

// Called when a team plan is created or a season rolls over: if the club has
// QuickBooks connected and the team doesn't yet have a Class mapped, finds or
// creates one named after the team and stores it on the Team record. No-ops
// quietly if QuickBooks isn't connected — mapping can always be done later
// from Payments > QuickBooks Mapping.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManage(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { team_id } = body;
    if (!team_id) return Response.json({ error: 'Missing team_id' }, { status: 400 });

    const svc = base44.asServiceRole;
    const team = await svc.entities.Team.get(team_id).catch(() => null);
    if (!team) return Response.json({ error: 'Team not found' }, { status: 404 });
    if (team.qbo_class_id) return Response.json({ success: true, skipped: true, class_id: team.qbo_class_id });

    const club = await svc.entities.Club.get(user.club_id).catch(() => null);
    if (!club?.quickbooks_connected) return Response.json({ success: true, skipped: true, reason: 'QuickBooks not connected' });

    const qb = await getClubQbConnection(base44, user.club_id);
    const qboClass = await findOrCreateClass(qb, team.name);
    if (!qboClass?.id) return Response.json({ success: false, error: 'QuickBooks did not return a Class id' });

    await svc.entities.Team.update(team_id, { qbo_class_id: qboClass.id, qbo_class_name: qboClass.name });
    return Response.json({ success: true, class_id: qboClass.id, class_name: qboClass.name });
  } catch (error) {
    console.error('ensure-team-qbo-class error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}