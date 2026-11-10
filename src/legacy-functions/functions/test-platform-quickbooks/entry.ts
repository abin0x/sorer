// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

/**
 * Returns the platform-level QuickBooks connection status (stored in
 * ClubQuickBooksConnection with club_id="__platform__").
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    const clientId = Deno.env.get("QUICKBOOKS_CLIENT_ID");
    const clientSecret = Deno.env.get("QUICKBOOKS_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return Response.json({
        connected: false,
        credentials_set: false,
        error: "QUICKBOOKS_CLIENT_ID / QUICKBOOKS_CLIENT_SECRET not set in Secrets.",
      });
    }

    const conns = await base44.asServiceRole.entities.ClubQuickBooksConnection.filter({
      club_id: "__platform__",
    });
    const conn = conns?.[0];

    if (!conn) {
      return Response.json({
        connected: false,
        credentials_set: true,
        error: "Not connected yet. Click Connect to authorize.",
      });
    }

    const expiresAt = conn.token_expires_at
      ? new Date(conn.token_expires_at).getTime()
      : NaN;
    const isExpired = !conn.refresh_token || isNaN(expiresAt) || expiresAt < Date.now();

    return Response.json({
      connected: true,
      credentials_set: true,
      realm_id: conn.realm_id,
      connected_by: conn.connected_by || null,
      connected_date: conn.connected_date || null,
      status: isExpired ? "expired" : "connected",
    });
  } catch (error) {
    console.error("test-platform-quickbooks error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}