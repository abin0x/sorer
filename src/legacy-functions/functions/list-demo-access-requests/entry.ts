// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

// System-owner-only: returns all DemoAccessRequest records.
// Runs as the service role to bypass RLS, with an explicit auth check
// so only system_owner / system_admin / platform admin can call it.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only system owners / platform admins can list demo access requests
    const isAuthorized =
      user.role === 'admin' ||
      user.is_super_admin === true ||
      user.system_role === 'system_owner' ||
      user.system_role === 'system_admin';
    if (!isAuthorized) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = base44.asServiceRole;
    const rows = await svc.entities.DemoAccessRequest.list('-updated_date', 200);
    return Response.json({ requests: rows || [] });
  } catch (error) {
    console.error('list-demo-access-requests error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}