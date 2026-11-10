// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { logAudit } from "../../shared/auditLog.ts";

const ADMIN_ROLES = ["master_admin", "admin", "club_director", "club_admin"];

// Saves tenant-specific integration credentials (Google Maps API key,
// Ayrshare API key) to ClubCredential. Each club admin manages their own
// keys from the Connections page — no global secrets required for
// per-tenant services.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.club_id)
      return Response.json({ error: "Your user is not associated with a club." }, { status: 400 });
    if (user.role !== "admin" && !ADMIN_ROLES.includes(user.custom_role)) {
      return Response.json({ error: "Forbidden — admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { google_maps_api_key, ayrshare_api_key } = body;

    const existing = await base44.asServiceRole.entities.ClubCredential.filter(
      { club_id: user.club_id },
      { limit: 1 }
    );
    const cred = existing?.items?.[0] || existing?.[0];

    const credData: any = { club_id: user.club_id };
    if (google_maps_api_key !== undefined) credData.google_maps_api_key = google_maps_api_key || null;
    if (ayrshare_api_key !== undefined) credData.ayrshare_api_key = ayrshare_api_key || null;
    if (cred) {
      await base44.asServiceRole.entities.ClubCredential.update(cred.id, credData);
    } else {
      await base44.asServiceRole.entities.ClubCredential.create(credData);
    }

    await logAudit(base44, {
      club_id: user.club_id,
      user,
      action: "club_integrations_updated",
      entity_type: "ClubCredential",
      entity_id: cred?.id || user.club_id,
      metadata: { google_maps: !!google_maps_api_key, ayrshare: !!ayrshare_api_key },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("save-club-integrations error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}