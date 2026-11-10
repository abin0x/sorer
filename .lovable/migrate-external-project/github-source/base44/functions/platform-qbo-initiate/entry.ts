/**
 * Initiates the platform-level QuickBooks OAuth flow using the
 * QUICKBOOKS_CLIENT_ID env var (not per-club credentials).
 *
 * Returns the Intuit authorization URL for the system owner to open.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const clientId = Deno.env.get("QUICKBOOKS_CLIENT_ID");
    if (!clientId) {
      return Response.json({
        error: "QUICKBOOKS_CLIENT_ID not set. Add it in Settings → Secrets.",
      }, { status: 500 });
    }

    const appUrl =
      req.headers.get("X-Base44-App-Url") ||
      Deno.env.get("WIX_CHECKOUT_APP_URL") ||
      "";
    if (!appUrl) {
      return Response.json({ error: "App URL not configured." }, { status: 500 });
    }

    const redirectUri = `${appUrl.replace(/\/$/, "")}/functions/platform-qbo-callback`;
    const state = "platform";
    const scope = "com.intuit.quickbooks.accounting";
    const authUrl =
      `https://appcenter.intuit.com/connect/oauth2` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&state=${encodeURIComponent(state)}`;

    return Response.json({ authUrl, redirectUri });
  } catch (error) {
    console.error("platform-qbo-initiate error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}