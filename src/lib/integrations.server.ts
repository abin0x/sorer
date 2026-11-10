import { randomBytes } from "crypto";

export type Provider =
  | "stripe" | "echelon" | "quickbooks" | "resend" | "square" | "paypal" | "custom_gateway"
  | "google_calendar" | "google_maps" | "facebook" | "instagram" | "x" | "youtube" | "linkedin";

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// Confirms the caller is an owner/admin member of the club, or an explicit system owner (system_owner_grants). Other platform roles do not count.
export async function assertClubAdmin(supabase: any, clubId: string) {
  const { data, error } = await supabase.rpc("is_club_manager", { _club_id: clubId });
  if (error || data !== true) throw new Error("Only club owners and admins can manage connections.");
}

export async function setIntegration(clubId: string, provider: Provider, patch: Record<string, unknown>) {
  const db = await admin();
  const { error } = await (db as any)
    .from("club_integrations")
    .upsert({ club_id: clubId, provider, ...patch }, { onConflict: "club_id,provider" });
  if (error) throw new Error("Connection could not be saved.");
}

export type SecretBag = Record<string, string | undefined> & {
  access_token?: string | undefined; refresh_token?: string | undefined; api_key?: string | undefined; expires_at?: string | undefined;
};

// Secrets live only in Supabase Vault (service-role functions). Merges with the existing value.
export async function setSecret(clubId: string, provider: Provider, patch: SecretBag, replace = false) {
  const db = await admin();
  const current = replace ? {} : (await getSecret(clubId, provider)) ?? {};
  const { error } = await (db as any).rpc("integration_secret_put", {
    _club: clubId, _provider: provider, _secret: JSON.stringify({ ...current, ...patch }),
  });
  if (error) throw new Error("Credentials could not be stored securely.");
}

export async function getSecret(clubId: string, provider: Provider): Promise<SecretBag | null> {
  const db = await admin();
  const { data, error } = await (db as any).rpc("integration_secret_get", { _club: clubId, _provider: provider });
  if (error || !data) return null;
  try { return JSON.parse(data as string); } catch { return null; }
}

export async function clearSecret(clubId: string, provider: Provider) {
  const db = await admin();
  await (db as any).rpc("integration_secret_delete", { _club: clubId, _provider: provider });
}

// ---------- single-use OAuth state (stored server-side, 10 min) ----------
export async function createOAuthState(row: { clubId: string; userId: string; provider: Provider; origin: string; codeVerifier?: string | undefined }) {
  const state = randomBytes(32).toString("hex");
  const db = await admin();
  const { error } = await (db as any).from("club_oauth_states").insert({
    state, club_id: row.clubId, user_id: row.userId, provider: row.provider, origin: row.origin,
    code_verifier: row.codeVerifier ?? null, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (error) throw new Error("Connection could not be started.");
  return state;
}

export async function consumeOAuthState(state: string) {
  if (!/^[a-f0-9]{64}$/.test(state)) throw new Error("This connection link is invalid.");
  const db = await admin();
  const { data } = await (db as any).from("club_oauth_states")
    .update({ used_at: new Date().toISOString() })
    .eq("state", state).is("used_at", null).gt("expires_at", new Date().toISOString())
    .select("club_id,user_id,provider,origin,code_verifier").maybeSingle();
  if (!data) throw new Error("This connection link expired. Please try again.");
  return data as { club_id: string; user_id: string; provider: Provider; origin: string; code_verifier: string | null };
}

export function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set up yet. Add it in the project's secrets.`);
  return v;
}

// ---------- Stripe ----------
export async function stripe(path: string, method = "GET", form?: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${requireEnv("STRIPE_SECRET_KEY")}`,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form ? new URLSearchParams(form).toString() : null,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe [${res.status}]: ${json?.error?.message || JSON.stringify(json)}`);
  return json;
}

// ---------- QuickBooks ----------
export const QB_AUTH_URL = "https://appcenter.intuit.com/app/connect/oauth2";
const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
export const qbApiBase = () =>
  (process.env["QUICKBOOKS_ENVIRONMENT"] || "production") === "sandbox"
    ? "https://sandbox-quickbooks.api.intuit.com"
    : "https://quickbooks.api.intuit.com";

async function qbToken(body: Record<string, string>) {
  const basic = Buffer.from(`${requireEnv("QUICKBOOKS_CLIENT_ID")}:${requireEnv("QUICKBOOKS_CLIENT_SECRET")}`).toString("base64");
  const res = await fetch(QB_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`QuickBooks [${res.status}]: ${json?.error_description || json?.error || JSON.stringify(json)}`);
  return json as { access_token: string; refresh_token: string; expires_in: number };
}

export const qbExchangeCode = (code: string, redirectUri: string) =>
  qbToken({ grant_type: "authorization_code", code, redirect_uri: redirectUri });

// Returns a valid access token for the club, refreshing it when needed.
export async function qbAccessToken(clubId: string) {
  const s = await getSecret(clubId, "quickbooks");
  if (!s?.refresh_token) throw new Error("QuickBooks is not connected for this club.");
  if (s.access_token && s.expires_at && new Date(s.expires_at).getTime() - Date.now() > 60_000) return s.access_token;
  const t = await qbToken({ grant_type: "refresh_token", refresh_token: s.refresh_token });
  await setSecret(clubId, "quickbooks", {
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
  });
  return t.access_token;
}

export async function qbGet(clubId: string, realmId: string, path: string) {
  const token = await qbAccessToken(clubId);
  const res = await fetch(`${qbApiBase()}/v3/company/${realmId}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`QuickBooks [${res.status}]: ${JSON.stringify(json?.Fault || json)}`);
  return json;
}

// ---------- Resend ----------
export async function resend(apiKey: string, path: string, method = "GET", body?: unknown) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : null,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend [${res.status}]: ${json?.message || JSON.stringify(json)}`);
  return json;
}
