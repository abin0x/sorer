import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

export default async function (req: Request): Promise<Response> {
  try {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') return Response.json({error:'System administrator access required'}, {status:403});
  const secretKey = secrets.get("STRIPE_SECRET_KEY");

  if (!secretKey) {
    return Response.json({
      connected: false,
      error: "STRIPE_SECRET_KEY not set. Add it in Settings → Secrets.",
    });
  }

    const resp = await fetch("https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${secretKey}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      return Response.json({
        connected: false,
        error: body?.error?.message || `Stripe returned ${resp.status}`,
      });
    }

    const account = await resp.json();
    const balanceResponse = await fetch('https://api.stripe.com/v1/balance', {headers:{Authorization:`Bearer ${secretKey}`},signal:AbortSignal.timeout(10000)});
    const balance = await balanceResponse.json();
    if (!balanceResponse.ok) return Response.json({connected:false,error:balance.error?.message || 'Unable to verify Stripe mode'});
    return Response.json({
      live_mode: balance.livemode === true,
      ready_for_live_payments: balance.livemode === true && account.charges_enabled === true,
      checked_at: new Date().toISOString(),
      connected: true,
      account_id: account.id,
      account_name:
        account.business_profile?.name ||
        account.settings?.dashboard?.display_name ||
        account.id,
      country: account.country,
      default_currency: account.default_currency,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    });
  } catch (e) {
    return Response.json({
      connected: false,
      error: e instanceof Error ? e.message : "Network error reaching Stripe",
    });
  }
}