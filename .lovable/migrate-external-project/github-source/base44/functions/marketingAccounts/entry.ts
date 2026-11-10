import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

const ADMIN_ROLES = ["master_admin", "admin", "club_director", "club_admin", "marketing_director"];
const AYRSHARE = "https://app.ayrshare.com/api";
const PLATFORM_MAP: Record<string, string> = { x: "twitter", instagram: "instagram", facebook: "facebook", linkedin: "linkedin", tiktok: "tiktok", youtube: "youtube" };

async function loadCred(svc: any, clubId: string) {
  const page = await svc.entities.ClubCredential.filter({ club_id: clubId }, { limit: 1 });
  return page?.items?.[0] || (Array.isArray(page) ? page[0] : null);
}

// marketingAccounts — per-club social account management through Ayrshare.
//   action: "save_key"  — store the club's Ayrshare API key in ClubCredential
//   action: "sync"      — pull connected social accounts from Ayrshare and upsert SocialAccount rows
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.club_id) return Response.json({ error: "No club" }, { status: 400 });
    if (user.role !== "admin" && !ADMIN_ROLES.includes(user.custom_role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const { action, profile_key, ayrshare_api_key } = await req.json();

    if (action === "save_key") {
      await base44.functions.invoke("save-club-integrations", { ayrshare_api_key });
      return Response.json({ success: true });
    }

    if (action === "sync") {
      const cred = await loadCred(base44.asServiceRole, user.club_id);
      const apiKey = cred?.ayrshare_api_key;
      if (!apiKey) return Response.json({ error: "No Ayrshare API key set. Add it in Connections first." }, { status: 400 });
      const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
      if (profile_key) headers["Profile-Key"] = profile_key;
      const r = await fetch(`${AYRSHARE}/accounts`, { headers });
      if (!r.ok) {
        const t = await r.text();
        return Response.json({ error: `Ayrshare error: ${r.status} ${t}` }, { status: 502 });
      }
      const accounts: any[] = await r.json();
      const existing = await base44.entities.SocialAccount.filter({ club_id: user.club_id }, { limit: 20 });
      const seen: string[] = [];
      for (const a of accounts) {
        const platform = a.platform || a.socialPlatform;
        if (!platform) continue;
        const row = existing.items?.find((e: any) => e.platform === platform);
        const tokenExpiresAt = a.expiresAt || a.tokenExpiresAt || a.expirationDate || null;
        const data = { club_id: user.club_id, platform, account_name: a.name || a.displayName || "", account_handle: a.handle || a.username || "", status: a.active === false ? "revoked" : "active", last_synced_at: new Date().toISOString(), ...(tokenExpiresAt ? { token_expires_at: tokenExpiresAt } : {}) };
        if (row) await base44.entities.SocialAccount.update(row.id, data);
        else await base44.entities.SocialAccount.create(data);
        seen.push(platform);
      }
      return Response.json({ connected: seen.length, platforms: seen });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("marketingAccounts error", error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}