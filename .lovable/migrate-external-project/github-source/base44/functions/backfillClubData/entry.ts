import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

// Super-admin tool: backfills all untagged records across tenant entities with a club_id.
// Run from the SaaS Admin console. Idempotent — only touches records where club_id is
// missing/null/empty, so it's safe to run repeatedly (e.g. after importing new data).
const TENANT_ENTITIES = [
  'Player', 'Team', 'Guardian', 'Program', 'Task', 'Location',
  'Coach', 'Facility', 'Field', 'CalendarEvent', 'Registration',
  'Payment', 'Expense', 'PlayerNote', 'PlayerFeedback', 'PlayerEvaluation',
];

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && !user.is_super_admin) {
      return Response.json({ error: 'Forbidden — platform super admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { club_id } = body;
    if (!club_id) return Response.json({ error: 'club_id is required' }, { status: 400 });

    const results = {};
    for (const entityName of TENANT_ENTITIES) {
      try {
        const entity = base44.asServiceRole.entities[entityName];
        if (!entity?.updateMany) {
          results[entityName] = 'skipped (no updateMany)';
          continue;
        }
        // Tag every record missing a club_id (null, empty, or field absent)
        const res = await entity.updateMany(
          { $or: [ { club_id: { $exists: false } }, { club_id: null }, { club_id: '' } ] },
          { $set: { club_id } }
        );
        results[entityName] = res?.modifiedCount ?? res?.matchedCount ?? 'done';
      } catch (e) {
        results[entityName] = `error: ${e.message}`;
      }
    }
    return Response.json({ success: true, club_id, results });
  } catch (error) {
    console.error('backfillClubData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}