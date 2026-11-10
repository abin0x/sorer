import { isTrustedOrigin } from "./trustedOrigin";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PROVIDER_KEYS, validateManualFields, type ProviderKey } from "./integrationSettings";

const club = z.object({ clubId: z.string().min(1).max(100) });
const origin = z.string().url().refine(isTrustedOrigin, "Invalid origin").transform((u) => new URL(u).origin);
const OAUTH_KEYS = ["quickbooks", "google_calendar", "youtube", "facebook", "instagram", "x", "linkedin"] as const;

// Which native OAuth apps the platform has configured (no secrets returned).
export const connectionAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { oauthReady } = await import("./oauthProviders.server");
    const out: Record<string, boolean> = { stripe: !!process.env["STRIPE_SECRET_KEY"], echelon_platform: !!process.env["ECHELON_SECURITY_KEY"] };
    for (const k of OAUTH_KEYS) out[k] = oauthReady(k);
    return out;
  });

export const startClubOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => club.extend({ provider: z.enum(OAUTH_KEYS), origin }).parse(d))
  .handler(async ({ data, context }) => {
    const s = await import("./integrations.server");
    const o = await import("./oauthProviders.server");
    await s.assertClubAdmin(context.supabase, data.clubId);
    const pk = o.OAUTH[data.provider]?.pkce ? o.pkcePair() : null;
    const state = await s.createOAuthState({ clubId: data.clubId, userId: context.userId, provider: data.provider, origin: data.origin, codeVerifier: pk?.verifier });
    return { url: o.buildAuthUrl(data.provider, data.origin, state, pk?.challenge) };
  });

// Echelon's gateway uses the NMI-compatible Query API; a bad key returns "Authentication Failed".
async function echelonCheckKey(key: string) {
  const base = process.env["ECHELON_GATEWAY_URL"] || "https://secure.nmi.com";
  const r = await fetch(`${base}/api/query.php`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ security_key: key, transaction_id: "0" }).toString(),
  });
  const t = await r.text();
  return r.ok && !/error_response|authentication failed/i.test(t);
}

async function verifyManual(provider: ProviderKey, v: any) {
  if (provider === "echelon") {
    if (!(await echelonCheckKey(v.security_key))) throw new Error("Echelon didn’t accept that security key.");
    return { label: `Echelon ••••${v.security_key.slice(-4)}`, external: null, meta: {} };
  }
  if (provider === "square") {
    const host = v.environment === "sandbox" ? "connect.squareupsandbox.com" : "connect.squareup.com";
    const r = await fetch(`https://${host}/v2/locations`, { headers: { Authorization: `Bearer ${v.access_token}`, "Square-Version": "2024-06-04" } });
    const j: any = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error("Square didn’t accept that access token.");
    const loc = (j.locations || []).find((l: any) => !v.location_id || l.id === v.location_id);
    if (!loc) throw new Error("That Square location wasn’t found.");
    return { label: loc.business_name || loc.name || "Square", external: loc.merchant_id ?? loc.id, meta: { location_id: loc.id, environment: v.environment } };
  }
  if (provider === "paypal") {
    const host = v.environment === "sandbox" ? "api-m.sandbox.paypal.com" : "api-m.paypal.com";
    const r = await fetch(`https://${host}/v1/oauth2/token`, {
      method: "POST", body: "grant_type=client_credentials",
      headers: { Authorization: `Basic ${Buffer.from(`${v.client_id}:${v.client_secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!r.ok) throw new Error("PayPal didn’t accept that client ID and secret.");
    return { label: `PayPal (${v.environment})`, external: v.client_id.slice(0, 8), meta: { environment: v.environment } };
  }
  if (provider === "resend") {
    const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${v.api_key}` } });
    if (r.status === 401) throw new Error("Resend didn’t accept that API key.");
    const j: any = r.ok ? await r.json().catch(() => ({})) : {};
    return { label: v.from_email, external: v.from_email, meta: { domains: (j.data || []).map((d: any) => ({ name: d.name, status: d.status })) } };
  }
  if (provider === "custom_gateway") {
    return { label: v.gateway_name, external: new URL(v.api_base_url).host, meta: { api_base_url: v.api_base_url, gateway_name: v.gateway_name } };
  }
  return { label: "Google Maps", external: null, meta: {} };
}

const NON_SECRET = new Set(["environment", "location_id", "gateway_name", "api_base_url", "from_email"]);

export const saveManualConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  // Never put credential values in validation errors.
  .inputValidator((d: { clubId: string; provider: string; fields: Record<string, unknown> }) => {
    const c = club.safeParse({ clubId: d?.clubId });
    const p = z.enum(PROVIDER_KEYS).safeParse(d?.provider);
    if (!c.success || !p.success || typeof d.fields !== "object" || !d.fields) throw new Error("Invalid connection request.");
    const v = validateManualFields(p.data, d.fields);
    if (!v.ok) throw new Error(v.error);
    return { clubId: c.data.clubId, provider: p.data, values: v.values };
  })
  .handler(async ({ data, context }) => {
    const s = await import("./integrations.server");
    await s.assertClubAdmin(context.supabase, data.clubId);
    let result;
    try { result = await verifyManual(data.provider, data.values); }
    catch (e: any) { throw new Error(e?.message?.length < 120 ? e.message : "Those details couldn’t be verified."); }
    const secret: Record<string, string> = {};
    for (const [k, v] of Object.entries(data.values)) if (!NON_SECRET.has(k)) secret[k] = v;
    await s.setSecret(data.clubId, data.provider, secret, true);
    await s.setIntegration(data.clubId, data.provider, {
      status: "connected", display_name: result.label, external_account_id: result.external, metadata: result.meta,
      connected_by: context.userId, connected_at: new Date().toISOString(), last_error: null,
    });
    return { ok: true };
  });

export const disconnectClubConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => club.extend({ provider: z.enum(PROVIDER_KEYS) }).parse(d))
  .handler(async ({ data, context }) => {
    const s = await import("./integrations.server");
    await s.assertClubAdmin(context.supabase, data.clubId);
    const secret = await s.getSecret(data.clubId, data.provider);
    // Best-effort revocation at the provider.
    try {
      if (secret?.access_token && (data.provider === "google_calendar" || data.provider === "youtube"))
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(secret.refresh_token || secret.access_token)}`, { method: "POST" });
      if (secret?.refresh_token && data.provider === "quickbooks") {
        const id = process.env["QUICKBOOKS_CLIENT_ID"], sec = process.env["QUICKBOOKS_CLIENT_SECRET"];
        if (id && sec) await fetch("https://developer.api.intuit.com/v2/oauth2/tokens/revoke", { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${id}:${sec}`).toString("base64")}`, "Content-Type": "application/json" }, body: JSON.stringify({ token: secret.refresh_token }) });
      }
    } catch { /* still remove locally */ }
    await s.clearSecret(data.clubId, data.provider);
    await s.setIntegration(data.clubId, data.provider, {
      status: "disconnected", external_account_id: null, display_name: null, metadata: {}, connected_at: null, last_error: null,
    });
    if (data.provider === "quickbooks") {
      const db = await s.admin();
      await (db as any).from("clubs").update({ quickbooks_connected: false }).eq("id", data.clubId);
    }
    return { ok: true };
  });
