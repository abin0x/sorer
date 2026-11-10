import { createHash, randomBytes } from "crypto";
import type { Provider } from "./integrations.server";

// Native OAuth apps owned by the platform; each club authorizes its own account.
type OAuthConfig = {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string[];
  basicAuth?: boolean;
  pkce?: boolean;
  scopeSep?: string;
  extra?: Record<string, string>;
  callbackPath?: string;
};

const GOOGLE = {
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
  clientSecretEnv: ["GOOGLE_OAUTH_CLIENT_SECRET", "google_oauth_client_secret"],
  extra: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
};
const META = {
  authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
  tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
  clientIdEnv: "META_APP_ID",
  clientSecretEnv: ["META_APP_SECRET"],
  scopeSep: ",",
};

export const OAUTH: Partial<Record<Provider, OAuthConfig>> = {
  quickbooks: {
    authUrl: "https://appcenter.intuit.com/connect/oauth2",
    tokenUrl: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    scopes: ["com.intuit.quickbooks.accounting"],
    clientIdEnv: "QUICKBOOKS_CLIENT_ID", clientSecretEnv: ["QUICKBOOKS_CLIENT_SECRET"],
    basicAuth: true, callbackPath: "/api/public/quickbooks/callback",
  },
  google_calendar: { ...GOOGLE, scopes: ["openid", "email", "https://www.googleapis.com/auth/calendar"] },
  youtube: { ...GOOGLE, scopes: ["openid", "email", "https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"] },
  facebook: { ...META, scopes: ["pages_show_list", "pages_manage_posts", "pages_read_engagement"] },
  instagram: { ...META, scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list", "business_management"] },
  x: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    clientIdEnv: "X_CLIENT_ID", clientSecretEnv: ["X_CLIENT_SECRET"], basicAuth: true, pkce: true,
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["openid", "profile", "w_member_social"],
    clientIdEnv: "LINKEDIN_CLIENT_ID", clientSecretEnv: ["LINKEDIN_CLIENT_SECRET"],
  },
};

const env = (names: string[]) => names.map((n) => process.env[n]).find(Boolean);

export function oauthReady(provider: Provider) {
  const c = OAUTH[provider];
  return !!c && !!process.env[c.clientIdEnv] && !!env(c.clientSecretEnv);
}

export function callbackUrl(provider: Provider, origin: string) {
  return `${origin}${OAUTH[provider]?.callbackPath ?? "/api/public/oauth/callback"}`;
}

export function pkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildAuthUrl(provider: Provider, origin: string, state: string, challenge?: string) {
  const c = OAUTH[provider];
  if (!c || !oauthReady(provider)) throw new Error("This connection isn't available yet. The platform app keys still need to be added.");
  const url = new URL(c.authUrl);
  url.searchParams.set("client_id", process.env[c.clientIdEnv]!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", callbackUrl(provider, origin));
  url.searchParams.set("scope", c.scopes.join(c.scopeSep ?? " "));
  url.searchParams.set("state", state);
  for (const [k, v] of Object.entries(c.extra ?? {})) url.searchParams.set(k, v);
  if (c.pkce && challenge) { url.searchParams.set("code_challenge", challenge); url.searchParams.set("code_challenge_method", "S256"); }
  return url.toString();
}

async function tokenRequest(provider: Provider, body: Record<string, string>) {
  const c = OAUTH[provider]!;
  const id = process.env[c.clientIdEnv]!, secret = env(c.clientSecretEnv)!;
  const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" };
  if (c.basicAuth) headers["Authorization"] = `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
  else Object.assign(body, { client_id: id, client_secret: secret });
  if (c.pkce) body["client_id"] = id;
  const res = await fetch(c.tokenUrl, { method: "POST", headers, body: new URLSearchParams(body).toString() });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    console.error(`${provider} token exchange failed`, res.status, json?.error);
    throw new Error("The provider did not approve the connection.");
  }
  return json as { access_token: string; refresh_token?: string; expires_in?: number };
}

export const exchangeCode = (provider: Provider, code: string, origin: string, verifier?: string | null) =>
  tokenRequest(provider, {
    grant_type: "authorization_code", code, redirect_uri: callbackUrl(provider, origin),
    ...(verifier ? { code_verifier: verifier } : {}),
  });

export const refreshToken = (provider: Provider, refresh: string) =>
  tokenRequest(provider, { grant_type: "refresh_token", refresh_token: refresh });

// Best-effort account label shown on the card. Never returns tokens.
export async function accountLabel(provider: Provider, token: string): Promise<string | null> {
  try {
    const get = async (u: string) => (await fetch(u, { headers: { Authorization: `Bearer ${token}` } })).json() as Promise<any>;
    if (provider === "google_calendar") return (await get("https://openidconnect.googleapis.com/v1/userinfo")).email ?? null;
    if (provider === "youtube") return (await get("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true")).items?.[0]?.snippet?.title ?? null;
    if (provider === "facebook" || provider === "instagram") return (await get("https://graph.facebook.com/v19.0/me?fields=name")).name ?? null;
    if (provider === "x") { const j = await get("https://api.twitter.com/2/users/me"); return j.data?.username ? `@${j.data.username}` : null; }
    if (provider === "linkedin") return (await get("https://api.linkedin.com/v2/userinfo")).name ?? null;
  } catch { /* optional */ }
  return null;
}

export const PLATFORM_APP_ENVS: Record<string, string[]> = {
  google: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"],
  meta: ["META_APP_ID", "META_APP_SECRET"],
  x: ["X_CLIENT_ID", "X_CLIENT_SECRET"],
  linkedin: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
};
