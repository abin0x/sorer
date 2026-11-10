// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { logAudit } from '../../shared/auditLog.ts';

const ADMIN_ROLES = ['master_admin', 'admin', 'club_director', 'club_admin'];

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.club_id) return Response.json({ error: 'Your user is not associated with a club.' }, { status: 400 });
    if (user.role !== 'admin' && !ADMIN_ROLES.includes(user.custom_role)) {
      return Response.json({ error: 'Forbidden — admin access required' }, { status: 403 });
    }

    // Only ever touch THIS user's club connection — club_id is resolved server-side, never from the client.
    const conns = await base44.asServiceRole.entities.ClubQuickBooksConnection.filter({ club_id: user.club_id });
    for (const conn of conns) {
      await base44.asServiceRole.entities.ClubQuickBooksConnection.delete(conn.id);
    }

    // Clear QB credentials from ClubCredential
    const existingCred = await base44.asServiceRole.entities.ClubCredential.filter({ club_id: user.club_id });
    if (existingCred?.[0]) {
      await base44.asServiceRole.entities.ClubCredential.update(existingCred[0].id, {
        quickbooks_client_id: null,
        quickbooks_client_secret: null,
      });
    }

    await base44.asServiceRole.entities.Club.update(user.club_id, {
      quickbooks_connected: false,
      quickbooks_realm_id: null,
    });

    await logAudit(base44, {
      club_id: user.club_id,
      user,
      action: 'quickbooks_disconnected',
      entity_type: 'ClubQuickBooksConnection',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('disconnectQuickBooks error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}