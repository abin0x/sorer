// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { getClubQbConnection, listQboClasses, listQboLocations } from '../../shared/quickbooksApi.ts';

const ADMIN_ROLES = ['master_admin', 'admin', 'club_director', 'club_admin', 'bookkeeper'];

function canManage(user) {
  return user && (user.role === 'admin' || ADMIN_ROLES.includes(user.custom_role));
}

// Returns the club's Teams and Branches alongside the live QuickBooks Class
// and Location lists, so an admin can map Team -> Class and Branch -> Location.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canManage(user)) return Response.json({ error: 'Forbidden — finance access required' }, { status: 403 });
    if (!user.club_id) return Response.json({ error: 'Your user is not associated with a club.' }, { status: 400 });

    const [teams, branches] = await Promise.all([
      base44.asServiceRole.entities.Team.filter({ club_id: user.club_id }),
      base44.asServiceRole.entities.Location.filter({ club_id: user.club_id }),
    ]);

    const qb = await getClubQbConnection(base44, user.club_id);
    const [classes, locations] = await Promise.all([
      listQboClasses(qb),
      listQboLocations(qb),
    ]);

    return Response.json({ teams, branches, classes, locations });
  } catch (error) {
    console.error('get-qbo-mapping-lists error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}