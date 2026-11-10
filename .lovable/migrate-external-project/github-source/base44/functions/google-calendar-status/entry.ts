import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

const CONNECTOR_ID = "6a5e5fd10345f132609f7f11";

// Checks whether the current app user has connected their own Google Calendar
// (APP_USER mode). Used by the Connections page to show connect/disconnect UI.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(
        CONNECTOR_ID
      );
      // If we got a token, the user is connected. Fetch primary calendar email.
      let email: string | null = null;
      try {
        const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${conn.accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          email = data.email || null;
        }
      } catch (e) {
        // ignore — still connected even if email fetch fails
      }
      return Response.json({ connected: true, email });
    } catch (e) {
      return Response.json({ connected: false });
    }
  } catch (error) {
    console.error("google-calendar-status error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}