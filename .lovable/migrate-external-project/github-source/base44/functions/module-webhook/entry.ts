// module-webhook — Stripe webhook handler for platform module subscriptions.
//
// Handles: checkout.session.completed, invoice.paid, invoice.payment_failed,
// customer.subscription.updated, customer.subscription.deleted.
//
// Verifies Stripe signatures, ignores duplicate event IDs, and re-fetches
// the subscription from Stripe for authoritative state.
//
// ACCESS IS GRANTED ONLY FROM invoice.paid — never from the success page.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { secrets } from "base44:runtime";
import {
  moduleHasAccess,
  stripeStatusToModuleStatus,
  getBillingSettings,
  computeGraceEndsAt,
  logEntitlementEvent,
} from "../../shared/moduleAccess.ts";

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  if (!sigHeader || !secret) return false;
  const parts: Record<string, string> = {};
  for (const kv of sigHeader.split(",")) {
    const idx = kv.indexOf("=");
    if (idx === -1) continue;
    parts[kv.slice(0, idx)] = kv.slice(idx + 1);
  }
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const expectedHex = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return expectedHex === v1;
}

async function fetchSubscription(stripeKey: string, subId: string): Promise<any> {
  const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}?expand[]=items.data.price`, {
    headers: { Authorization: `Bearer ${stripeKey}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    console.error("module-webhook: failed to re-fetch subscription", subId, res.status);
    return null;
  }
  return res.json();
}

export default async function (req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

    const webhookSecret = secrets.get("MODULE_STRIPE_WEBHOOK_SECRET");
    const stripeKey = secrets.get("STRIPE_SECRET_KEY");
    if (!webhookSecret || !stripeKey) {
      console.error("module-webhook: secrets not configured");
      return new Response("Not configured", { status: 500 });
    }

    const payload = await req.text();
    const sigHeader = req.headers.get("stripe-signature") || "";
    const valid = await verifyStripeSignature(payload, sigHeader, webhookSecret);
    if (!valid) {
      console.error("module-webhook: invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(payload);
    const eventId = event.id;
    const eventType = event.type;

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Dedup by event ID — Stripe may redeliver.
    const existing = await svc.entities.StripeWebhookEvent.filter({ event_id: eventId }, "-created_date", 1).catch(() => []);
    if (existing?.[0]?.processed) {
      return new Response("OK (duplicate)", { status: 200 });
    }

    // Record the event
    const eventRecord = existing?.[0] || await svc.entities.StripeWebhookEvent.create({
      event_id: eventId,
      event_type: eventType,
      processed: false,
    });

    try {
      switch (eventType) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(svc, stripeKey, event.data.object);
          break;
        case "invoice.paid":
          await handleInvoicePaid(svc, stripeKey, event.data.object);
          break;
        case "invoice.payment_failed":
          await handlePaymentFailed(svc, stripeKey, event.data.object);
          break;
        case "customer.subscription.updated":
          await handleSubscriptionUpdated(svc, stripeKey, event.data.object);
          break;
        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(svc, stripeKey, event.data.object);
          break;
        default:
          // Unhandled event type — not an error
          break;
      }

      await svc.entities.StripeWebhookEvent.update(eventRecord.id, {
        processed: true,
        processed_at: new Date().toISOString(),
      });
    } catch (innerErr) {
      console.error("module-webhook: handler error", innerErr);
      await svc.entities.StripeWebhookEvent.update(eventRecord.id, {
        processed: false,
        error: String(innerErr),
      });
      return new Response("Handler error", { status: 500 });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("module-webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
}

// --- checkout.session.completed ---
// Create/update the TenantSubscription and pending TenantModule records.
// Access is NOT granted here — that happens on invoice.paid.
async function handleCheckoutCompleted(svc: any, stripeKey: string, session: any) {
  const metadata = session.metadata || {};
  const clubId = metadata.club_id;
  const moduleKeys = metadata.module_keys ? metadata.module_keys.split(",").filter(Boolean) : [];
  if (!clubId) {
    console.error("module-webhook: checkout session missing club_id metadata", session.id);
    return;
  }

  const subscriptionId = session.subscription;
  const customerId = session.customer;

  // Find or create the TenantSubscription
  let subs = await svc.entities.TenantSubscription.filter({ club_id: clubId, stripe_subscription_id: subscriptionId }, "-created_date", 1).catch(() => []);
  let sub = subs?.[0];

  if (!sub) {
    // Try by checkout session ID
    subs = await svc.entities.TenantSubscription.filter({ club_id: clubId, checkout_session_id: session.id }, "-created_date", 1).catch(() => []);
    sub = subs?.[0];
  }

  if (sub) {
    await svc.entities.TenantSubscription.update(sub.id, {
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      status: "incomplete",
      module_keys: moduleKeys,
    });
  } else {
    sub = await svc.entities.TenantSubscription.create({
      club_id: clubId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      checkout_session_id: session.id,
      status: "incomplete",
      module_keys: moduleKeys,
    });
  }

  // Create or update TenantModule records as pending_payment
  const existing = await svc.entities.TenantModule.filter({ club_id: clubId }, "-created_date", 200).catch(() => []);
  const existingMap = new Map(existing.map((m) => [m.module_key, m]));
  const toCreate = [];
  const toUpdate = [];

  for (const key of moduleKeys) {
    const existingMod = existingMap.get(key);
    if (existingMod) {
      if (existingMod.status === "pending_payment" || !existingMod.stripe_subscription_id) {
        toUpdate.push({
          id: existingMod.id,
          stripe_subscription_id: subscriptionId,
          status: "pending_payment",
        });
      }
    } else {
      toCreate.push({
        club_id: clubId,
        module_key: key,
        status: "pending_payment",
        stripe_subscription_id: subscriptionId,
        subscription_id: sub.id,
      });
    }
  }

  if (toCreate.length > 0) await svc.entities.TenantModule.bulkCreate(toCreate);
  for (const u of toUpdate) {
    await svc.entities.TenantModule.update(u.id, { stripe_subscription_id: u.stripe_subscription_id, status: u.status });
  }
}

// --- invoice.paid ---
// THIS IS WHERE ACCESS IS GRANTED. Set modules to active or trialing.
async function handleInvoicePaid(svc: any, stripeKey: string, invoice: any) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  // Re-fetch the subscription from Stripe for authoritative state
  const sub = await fetchSubscription(stripeKey, subscriptionId);
  if (!sub) {
    console.error("module-webhook: could not re-fetch subscription", subscriptionId);
    return;
  }

  const metadata = sub.metadata || {};
  const clubId = metadata.club_id;
  const moduleKeys = metadata.module_keys ? metadata.module_keys.split(",").filter(Boolean) : [];
  if (!clubId) {
    console.error("module-webhook: subscription missing club_id metadata", subscriptionId);
    return;
  }

  const isTrial = sub.status === "trialing";
  const newStatus = isTrial ? "trialing" : "active";
  const periodStart = sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null;
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

  // Update TenantSubscription
  const subs = await svc.entities.TenantSubscription.filter({ club_id: clubId, stripe_subscription_id: subscriptionId }, "-created_date", 1).catch(() => []);
  const subRecord = subs?.[0];
  if (subRecord) {
    await svc.entities.TenantSubscription.update(subRecord.id, {
      status: sub.status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end || false,
      last_synced_at: new Date().toISOString(),
    });
  }

  // Update each TenantModule — GRANT ACCESS
  const modules = await svc.entities.TenantModule.filter({ club_id: clubId, stripe_subscription_id: subscriptionId }, "-created_date", 200).catch(() => []);
  for (const mod of modules) {
    const oldStatus = mod.status;
    // Only grant if currently pending, or recovering from past_due/suspended
    if (["pending_payment", "past_due", "suspended"].includes(oldStatus)) {
      const wasRecovery = oldStatus === "past_due" || oldStatus === "suspended";
      await svc.entities.TenantModule.update(mod.id, {
        status: newStatus,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        grace_ends_at: null,
        drift_flagged: false,
        drift_detail: null,
        last_synced_at: new Date().toISOString(),
      });
      await logEntitlementEvent(svc, {
        club_id: clubId,
        module_key: mod.module_key,
        action: wasRecovery ? "payment_recovered" : "granted",
        from_status: oldStatus,
        to_status: newStatus,
        actor: "stripe_webhook",
        metadata: { subscription_id: subscriptionId, invoice_id: invoice.id },
      });
    } else {
      // Already active/trialing — just sync dates
      await svc.entities.TenantModule.update(mod.id, {
        current_period_start: periodStart,
        current_period_end: periodEnd,
        last_synced_at: new Date().toISOString(),
      });
    }
  }
}

// --- invoice.payment_failed ---
// Set modules to past_due and start the grace period.
async function handlePaymentFailed(svc: any, stripeKey: string, invoice: any) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  const sub = await fetchSubscription(stripeKey, subscriptionId);
  if (!sub) return;

  const metadata = sub.metadata || {};
  const clubId = metadata.club_id;
  if (!clubId) return;

  const settings = await getBillingSettings(svc);
  const graceEndsAt = computeGraceEndsAt(settings.grace_period_days);

  // Update TenantSubscription
  const subs = await svc.entities.TenantSubscription.filter({ club_id: clubId, stripe_subscription_id: subscriptionId }, "-created_date", 1).catch(() => []);
  if (subs?.[0]) {
    await svc.entities.TenantSubscription.update(subs[0].id, {
      status: "past_due",
      last_synced_at: new Date().toISOString(),
    });
  }

  // Set each active/trialing TenantModule to past_due with grace
  const modules = await svc.entities.TenantModule.filter({ club_id: clubId, stripe_subscription_id: subscriptionId }, "-created_date", 200).catch(() => []);
  for (const mod of modules) {
    if (["active", "trialing"].includes(mod.status)) {
      const oldStatus = mod.status;
      await svc.entities.TenantModule.update(mod.id, {
        status: "past_due",
        grace_ends_at: graceEndsAt,
        last_synced_at: new Date().toISOString(),
      });
      await logEntitlementEvent(svc, {
        club_id: clubId,
        module_key: mod.module_key,
        action: "payment_failed",
        from_status: oldStatus,
        to_status: "past_due",
        reason: `Grace ends ${graceEndsAt}`,
        actor: "stripe_webhook",
        metadata: { subscription_id: subscriptionId, invoice_id: invoice.id, grace_ends_at: graceEndsAt },
      });
    }
  }
}

// --- customer.subscription.updated ---
// Sync the subscription status from Stripe. Handle cancellation requests.
async function handleSubscriptionUpdated(svc: any, stripeKey: string, subEvent: any) {
  const subscriptionId = subEvent.id;

  // Re-fetch for authoritative state
  const sub = await fetchSubscription(stripeKey, subscriptionId);
  if (!sub) return;

  const metadata = sub.metadata || {};
  const clubId = metadata.club_id;
  if (!clubId) return;

  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
  const periodStart = sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null;

  // Update TenantSubscription
  const subs = await svc.entities.TenantSubscription.filter({ club_id: clubId, stripe_subscription_id: subscriptionId }, "-created_date", 1).catch(() => []);
  if (subs?.[0]) {
    await svc.entities.TenantSubscription.update(subs[0].id, {
      status: sub.status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end || false,
      trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      last_synced_at: new Date().toISOString(),
    });
  }

  // Determine target module status
  let targetStatus = stripeStatusToModuleStatus(sub.status);
  let accessEndsAt = null;

  if (sub.cancel_at_period_end && sub.status !== "canceled") {
    // Subscription is set to cancel at period end — modules enter canceling
    targetStatus = "canceling";
    accessEndsAt = periodEnd;
  }

  // Update each TenantModule
  const modules = await svc.entities.TenantModule.filter({ club_id: clubId, stripe_subscription_id: subscriptionId }, "-created_date", 200).catch(() => []);
  for (const mod of modules) {
    if (mod.status === "complimentary") continue; // Don't override complimentary

    const oldStatus = mod.status;
    const patch: any = {
      current_period_start: periodStart,
      current_period_end: periodEnd,
      last_synced_at: new Date().toISOString(),
      drift_flagged: false,
      drift_detail: null,
    };

    if (targetStatus === "canceling") {
      patch.status = "canceling";
      patch.access_ends_at = accessEndsAt;
    } else if (targetStatus === "active" && oldStatus === "past_due") {
      // Payment recovered
      patch.status = "active";
      patch.grace_ends_at = null;
    } else if (targetStatus !== oldStatus && targetStatus !== "active") {
      patch.status = targetStatus;
    } else if (targetStatus === "active") {
      patch.status = "active";
      patch.grace_ends_at = null;
    }

    await svc.entities.TenantModule.update(mod.id, patch);

    if (patch.status && patch.status !== oldStatus) {
      await logEntitlementEvent(svc, {
        club_id: clubId,
        module_key: mod.module_key,
        action: "status_changed",
        from_status: oldStatus,
        to_status: patch.status,
        reason: `Stripe subscription updated to ${sub.status}`,
        actor: "stripe_webhook",
        metadata: { subscription_id: subscriptionId },
      });
    }
  }
}

// --- customer.subscription.deleted ---
// Set modules to expired (access ends immediately).
async function handleSubscriptionDeleted(svc: any, stripeKey: string, subEvent: any) {
  const subscriptionId = subEvent.id;

  // Re-fetch for authoritative state
  const sub = await fetchSubscription(stripeKey, subscriptionId);
  const metadata = sub?.metadata || subEvent.metadata || {};
  const clubId = metadata.club_id;
  if (!clubId) return;

  // Update TenantSubscription
  const subs = await svc.entities.TenantSubscription.filter({ club_id: clubId, stripe_subscription_id: subscriptionId }, "-created_date", 1).catch(() => []);
  if (subs?.[0]) {
    await svc.entities.TenantSubscription.update(subs[0].id, {
      status: "canceled",
      last_synced_at: new Date().toISOString(),
    });
  }

  // Expire each TenantModule
  const modules = await svc.entities.TenantModule.filter({ club_id: clubId, stripe_subscription_id: subscriptionId }, "-created_date", 200).catch(() => []);
  for (const mod of modules) {
    if (mod.status === "complimentary") continue;

    const oldStatus = mod.status;
    await svc.entities.TenantModule.update(mod.id, {
      status: "expired",
      last_synced_at: new Date().toISOString(),
    });
    await logEntitlementEvent(svc, {
      club_id: clubId,
      module_key: mod.module_key,
      action: "subscription_deleted",
      from_status: oldStatus,
      to_status: "expired",
      actor: "stripe_webhook",
      metadata: { subscription_id: subscriptionId },
    });
  }
}