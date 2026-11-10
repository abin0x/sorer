// module-checkout — creates a Stripe Checkout Session in subscription mode
// with one line item per selected module.
//
// The tenant_id is derived from the authenticated user's club_id — never
// from the client. Access is NOT granted here; it is granted only from the
// verified invoice.paid webhook. This function just starts the checkout.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { secrets } from "base44:runtime";

function resolveAppUrl(req: Request): string {
  return (
    req.headers.get("x-base44-app-url") ||
    Deno.env.get("WIX_CHECKOUT_APP_URL") ||
    ""
  );
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // tenant_id from the authenticated user — never from the client.
    const clubId = user.club_id;
    if (!clubId) return Response.json({ error: "No tenant context" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const moduleKeys: string[] = Array.isArray(body.module_keys) ? body.module_keys : [];
    if (moduleKeys.length === 0) return Response.json({ error: "Select at least one module" }, { status: 400 });

    const appUrl = resolveAppUrl(req);
    if (!appUrl) {
      console.error("module-checkout: no app URL");
      return Response.json({ error: "App URL not configured" }, { status: 500 });
    }

    const stripeKey = secrets.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("module-checkout: STRIPE_SECRET_KEY not set");
      return Response.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const svc = base44.asServiceRole;

    // Resolve ModuleCatalog entries — authoritative price IDs are server-side.
    const catalogEntries = await Promise.allSettled(
      moduleKeys.map((key) => svc.entities.ModuleCatalog.filter({ key, is_active: true }, "-created_date", 1))
    );
    const modules = catalogEntries
      .filter((r) => r.status === "fulfilled" && r.value?.[0])
      .map((r) => (r as PromiseFulfilledResult<any[]>).value[0]);

    if (modules.length !== moduleKeys.length) {
      const found = new Set(modules.map((m) => m.key));
      const missing = moduleKeys.filter((k) => !found.has(k));
      return Response.json({ error: `Module(s) not found or inactive: ${missing.join(", ")}` }, { status: 400 });
    }

    const withoutPrice = modules.filter((m) => !m.stripe_price_id);
    if (withoutPrice.length > 0) {
      return Response.json({ error: `No Stripe price for: ${withoutPrice.map((m) => m.key).join(", ")}` }, { status: 400 });
    }

    // Get trial period from BillingSettings
    const settingsRows = await svc.entities.BillingSettings.filter({ is_active: true }, "-created_date", 1).catch(() => []);
    const trialDays = settingsRows?.[0]?.trial_period_days ?? 0;

    // Build form-encoded body for Stripe Checkout Session
    const params = new URLSearchParams();
    params.append("mode", "subscription");
    modules.forEach((m, i) => {
      params.append(`line_items[${i}][price]`, m.stripe_price_id);
      params.append(`line_items[${i}][quantity]`, "1");
    });
    params.append("metadata[club_id]", clubId);
    params.append("metadata[module_keys]", moduleKeys.join(","));
    params.append("metadata[source]", "module_checkout");
    // Subscription-level metadata (available in subsequent webhook events)
    params.append("subscription_data[metadata][club_id]", clubId);
    params.append("subscription_data[metadata][module_keys]", moduleKeys.join(","));
    if (trialDays > 0) {
      params.append("subscription_data[trial_period_days]", String(trialDays));
    }
    params.append("success_url", `${appUrl}/ThankYou?modules=1`);
    params.append("cancel_url", `${appUrl}/Settings?tab=modules`);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (!stripeRes.ok) {
      const errText = await stripeRes.text();
      console.error("module-checkout: Stripe error", { status: stripeRes.status, errText });
      return Response.json({ error: "Could not start checkout" }, { status: 502 });
    }

    const session = await stripeRes.json();
    const redirectUrl = session.url;
    const sessionId = session.id;
    const subscriptionId = session.subscription;

    if (!redirectUrl) {
      console.error("module-checkout: no redirect URL in Stripe response", session);
      return Response.json({ error: "Could not start checkout" }, { status: 502 });
    }

    // Create a pending TenantSubscription — access is NOT granted yet.
    // The invoice.paid webhook will flip TenantModule statuses to active/trialing.
    await svc.entities.TenantSubscription.create({
      club_id: clubId,
      stripe_subscription_id: subscriptionId || null,
      checkout_session_id: sessionId,
      status: "incomplete",
      module_keys: moduleKeys,
    });

    // Create pending TenantModule records so has-module returns false until paid.
    const existingModules = await svc.entities.TenantModule.filter({ club_id: clubId }, "-created_date", 200).catch(() => []);
    const existingKeys = new Set(existingModules.map((m) => m.module_key));
    const newModules = moduleKeys.filter((k) => !existingKeys.has(k));
    if (newModules.length > 0) {
      await svc.entities.TenantModule.bulkCreate(
        newModules.map((key) => ({
          club_id: clubId,
          module_key: key,
          status: "pending_payment",
          stripe_subscription_id: subscriptionId || null,
        }))
      );
    }

    // Log the checkout start
    for (const key of moduleKeys) {
      await svc.entities.EntitlementEvent.create({
        club_id: clubId,
        module_key: key,
        action: "checkout_started",
        from_status: existingKeys.has(key) ? "existing" : null,
        to_status: "pending_payment",
        reason: `Checkout session ${sessionId}`,
        actor: user.email || "unknown",
        metadata: { checkout_session_id: sessionId, subscription_id: subscriptionId },
      }).catch((e) => console.error("entitlement event error", e));
    }

    return Response.json({ redirectUrl });
  } catch (error) {
    console.error("module-checkout error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}