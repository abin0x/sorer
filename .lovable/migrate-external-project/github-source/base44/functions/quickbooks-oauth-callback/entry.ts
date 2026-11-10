import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { logAudit } from '../../shared/auditLog.ts';
import { getQuickBooksOAuthCredentials } from '../../shared/clubCredentials.ts';

// Intuit redirects here with ?code=...&realmId=...&state=... after the club admin consents.
// We exchange the code for tokens and store them in ClubQuickBooksConnection (one per club).
// Returns a small HTML page that posts a message to the opener and closes itself.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const realmId = url.searchParams.get('realmId');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) return htmlResponse('QuickBooks connection was cancelled.', false);
    if (!code || !realmId) return htmlResponse('Missing authorization code from QuickBooks.', false);

    const user = await base44.auth.me();
    if (!user) return htmlResponse('You must be signed in to complete QuickBooks connection.', false);
    if (state !== user.club_id) return htmlResponse('State mismatch — connection refused.', false);

    const { clientId, clientSecret } = await getQuickBooksOAuthCredentials(base44, user.club_id);
    if (!clientId || !clientSecret) {
      return htmlResponse('QuickBooks OAuth credentials not configured. Add them in Connections first.', false);
    }

    const appUrl =
      req.headers.get('X-Base44-App-Url') ||
      process.env.WIX_CHECKOUT_APP_URL ||
      '';
    const redirectUri = `${appUrl.replace(/\/$/, '')}/functions/quickbooks-oauth-callback`;

    // Exchange authorization code for tokens
    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v2/tokens/bearer';
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    });
    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok) {
      const msg = tokenData?.error_description || tokenData?.error || `token exchange failed (${tokenRes.status})`;
      return htmlResponse(`Token exchange failed: ${msg}`, false);
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    // Upsert the club's QuickBooks connection
    const existing = await base44.asServiceRole.entities.ClubQuickBooksConnection.filter({
      club_id: user.club_id,
    });
    if (existing?.[0]) {
      await base44.asServiceRole.entities.ClubQuickBooksConnection.update(existing[0].id, {
        realm_id: realmId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
        connected_by: user.email,
      });
    } else {
      await base44.asServiceRole.entities.ClubQuickBooksConnection.create({
        club_id: user.club_id,
        realm_id: realmId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
        connected_by: user.email,
        connected_date: new Date().toISOString(),
      });
    }

    // Mark the club as QuickBooks-connected
    await base44.asServiceRole.entities.Club.update(user.club_id, {
      quickbooks_connected: true,
      quickbooks_realm_id: realmId,
    });

    await logAudit(base44, {
      club_id: user.club_id,
      user,
      action: 'quickbooks_connected',
      entity_type: 'ClubQuickBooksConnection',
      metadata: { realm_id: realmId },
    });

    return htmlResponse('QuickBooks connected successfully! You can close this window.', true);
  } catch (error) {
    console.error('quickbooks-oauth-callback error:', error);
    return htmlResponse(`Connection failed: ${error.message}`, false);
  }
}

function htmlResponse(message: string, success: boolean): Response {
  const color = success ? '#059669' : '#dc2626';
  const title = success ? 'Connected' : 'Connection Failed';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QuickBooks Connection</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc}
div{text-align:center;padding:2rem 2.5rem;border-radius:14px;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.08);max-width:420px}
h2{color:${color};margin:0 0 .5rem;font-size:1.25rem}p{color:#475569;font-size:.875rem;margin:.25rem 0}</style></head>
<body><div><h2>${success ? '✓' : '✕'} ${title}</h2><p>${message}</p>
${success ? '<p style="margin-top:1rem;font-size:.75rem;color:#94a3b8">You may close this tab.</p>' : ''}
<script>
if(window.opener){window.opener.postMessage({type:'qb-connected',success:${success}},'*');setTimeout(function(){window.close()},2500);}
</script></div></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}