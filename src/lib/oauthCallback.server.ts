// Shared OAuth return handler. Club and user come ONLY from the stored single-use state.
export async function handleOAuthCallback(request: Request) {
  const s = await import("./integrations.server");
  const o = await import("./oauthProviders.server");
  const url = new URL(request.url);
  const fallback = `${url.origin}/settings/integrations`;
  let back = fallback;
  try {
    const st = await s.consumeOAuthState(url.searchParams.get("state") || "");
    back = `${st.origin}/settings/integrations?club=${encodeURIComponent(st.club_id)}&provider=${st.provider}`;
    const code = url.searchParams.get("code");
    if (url.searchParams.get("error") || !code) return Response.redirect(`${back}&error=cancelled`, 302);
    const realmId = url.searchParams.get("realmId");
    if (st.provider === "quickbooks" && !realmId) throw new Error("QuickBooks did not return a company.");
    const t = await o.exchangeCode(st.provider, code, st.origin, st.code_verifier);
    await s.setSecret(st.club_id, st.provider, {
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expires_at: t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : undefined,
    }, true);
    let label: string | null = null;
    if (st.provider === "quickbooks") {
      try { label = (await s.qbGet(st.club_id, realmId!, `/companyinfo/${realmId}`))?.CompanyInfo?.CompanyName ?? null; } catch { /* optional */ }
      const db = await s.admin();
      await (db as any).from("clubs").update({ quickbooks_connected: true, quickbooks_realm_id: realmId }).eq("id", st.club_id);
    } else {
      label = await o.accountLabel(st.provider, t.access_token);
    }
    await s.setIntegration(st.club_id, st.provider, {
      status: "connected", external_account_id: realmId, display_name: label,
      connected_by: st.user_id, connected_at: new Date().toISOString(), last_error: null,
      metadata: st.provider === "quickbooks" ? { environment: process.env["QUICKBOOKS_ENVIRONMENT"] || "production" } : {},
    });
    return Response.redirect(`${back}&connected=1`, 302);
  } catch (e) {
    console.error("OAuth callback failed", e);
    return Response.redirect(`${back}${back.includes("?") ? "&" : "?"}error=failed`, 302);
  }
}
