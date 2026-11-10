// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

// Returns the current club's QuickBooks connection status for display on the
// Connections page. Returns ONLY safe metadata — access_token/refresh_token
// never leave the backend.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.club_id) return Response.json({ connected: false });

    const conns = await base44.asServiceRole.entities.ClubQuickBooksConnection.filter({ club_id: user.club_id });
    const conn = conns?.[0];
    if (!conn) return Response.json({ connected: false });

    const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : NaN;
    const isExpired = !conn.refresh_token || isNaN(expiresAt);

    return Response.json({
      connected: true,
      realm_id: conn.realm_id,
      connected_by: conn.connected_by || null,
      connected_date: conn.connected_date || null,
      is_sandbox: !!conn.is_sandbox,
      status: isExpired ? 'expired' : 'connected',
    });
  } catch (error) {
    console.error('quickbooks-connection-status error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}