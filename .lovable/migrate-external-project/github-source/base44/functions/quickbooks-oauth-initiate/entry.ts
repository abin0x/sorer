import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { getQuickBooksOAuthCredentials } from '../../shared/clubCredentials.ts';

// Returns the Intuit OAuth2 authorization URL for the current user's club.
// The frontend opens this URL in a popup; Intuit redirects to quickbooks-oauth-callback
// after the club admin consents.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.club_id) {
      return Response.json({ error: 'Your user is not associated with a club.' }, { status: 400 });
    }

    const { clientId } = await getQuickBooksOAuthCredentials(base44, user.club_id);
    if (!clientId) {
      return Response.json({ error: 'QuickBooks Client ID not configured. Enter your QuickBooks credentials below first.' }, { status: 500 });
    }

    const appUrl =
      req.headers.get('X-Base44-App-Url') ||
      process.env.WIX_CHECKOUT_APP_URL ||
      '';
    if (!appUrl) {
      return Response.json({ error: 'App URL not configured.' }, { status: 500 });
    }
    const redirectUri = `${appUrl.replace(/\/$/, '')}/functions/quickbooks-oauth-callback`;

    // state = club_id (verified in the callback against the authenticated user's club)
    const state = user.club_id;
    const scope = 'com.intuit.quickbooks.accounting';
    const authUrl =
      `https://appcenter.intuit.com/connect/oauth2` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&state=${encodeURIComponent(state)}`;

    return Response.json({ authUrl, redirectUri });
  } catch (error) {
    console.error('quickbooks-oauth-initiate error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}