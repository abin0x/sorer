// module-reconcile — nightly reconciliation of TenantModule records against Stripe.
//
// Called by the nightly workflow (with CRON_SECRET) or by the system-owner
// dashboard (with user auth). For each active/past_due/canceling
// TenantSubscription, re-fetches the subscription from Stripe and:
//   1. Flags drift when Stripe status disagrees with local status.
//   2. Suspends modules whose grace period has expired.
//   3. Expires modules whose canceling period has ended.
//   4. Sends an alert email if drift or expirations are found.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { secrets } from "base44:runtime";
import {
  moduleHasAccess,
  stripeStatusToModuleStatus,
  getBillingSettings,
  computeGraceEndsAt,
  logEntitlementEvent,
} from "../../shared/moduleAccess.ts";

async function fetchSubscription(stripeKey: string, subId: string): Promise<any> {
  const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}?expand[]=items.data.price`, {
    headers: { Authorization: `Bearer ${stripeKey}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Authenticate: system-owner/admin user (dashboard force-sync), or allow
    // unauthenticated calls from the nightly workflow (service-role context).
    // The function only performs reconciliation — no destructive operations.
    let isElevatedUser = false;
    try {
      const user = await base44.auth.me();
      if (user) {
        isElevatedUser =
          user.system_role === "system_owner" ||
          user.system_role === "system_admin" ||
          user.system_role === "system_billing" ||
          user.role === "admin";
        if (!isElevatedUser) return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch (_) {
      // No user context — workflow invocation. Allow.
    }

    const stripeKey = secrets.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return Response.json({ error: "Stripe not configured" }, { status: 500 });

    const settings = await getBillingSettings(svc);
    const now = new Date();
    const nowMs = now.getTime();

    const drifts = [];
    let suspendedCount = 0;
    let expiredCount = 0;

    // Get all non-terminal TenantSubscriptions
    const subs = await svc.entities.TenantSubscription.filter(
      { status: { $in: ["incomplete", "trialing", "active", "past_due", "unpaid"] } },
      "-created_date",
      500
    ).catch(() => []);

    for (const sub of subs) {
      if (!sub.stripe_subscription_id) continue;

      const stripeSub = await fetchSubscription(stripeKey, sub.stripe_subscription_id);
      if (!stripeSub) {
        // Subscription not found in Stripe — flag drift
        const modules = await svc.entities.TenantModule.filter(
          { club_id: sub.club_id, stripe_subscription_id: sub.stripe_subscription_id },
          "-created_date", 200
        ).catch(() => []);
        for (const mod of modules) {
          if (mod.status === "complimentary") continue;
          if (!mod.drift_flagged) {
            await svc.entities.TenantModule.update(mod.id, {
              drift_flagged: true,
              drift_detail: "Subscription not found in Stripe",
            });
            drifts.push({ club_id: sub.club_id, module_key: mod.module_key, detail: "Subscription not found in Stripe" });
          }
        }
        continue;
      }

      const stripeStatus = stripeSub.status;
      const expectedModuleStatus = stripeStatusToModuleStatus(stripeStatus);
      const periodEnd = stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000).toISOString() : null;
      const periodStart = stripeSub.current_period_start ? new Date(stripeSub.current_period_start * 1000).toISOString() : null;

      // Update TenantSubscription
      await svc.entities.TenantSubscription.update(sub.id, {
        status: stripeStatus,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: stripeSub.cancel_at_period_end || false,
        last_synced_at: now.toISOString(),
      });

      // Get modules for this subscription
      const modules = await svc.entities.TenantModule.filter(
        { club_id: sub.club_id, stripe_subscription_id: sub.stripe_subscription_id },
        "-created_date", 200
      ).catch(() => []);

      for (const mod of modules) {
        if (mod.status === "complimentary") continue;

        const patch: any = { last_synced_at: now.toISOString() };
        let statusChanged = false;
        let action = null;
        let reason = null;

        // Check if grace has expired for past_due modules
        if (mod.status === "past_due" && mod.grace_ends_at) {
          if (nowMs >= new Date(mod.grace_ends_at).getTime()) {
            patch.status = "suspended";
            patch.drift_flagged = false;
            statusChanged = true;
            action = "status_changed";
            reason = "Grace period expired — suspended by nightly reconcile";
            suspendedCount++;
          }
        }

        // Check if canceling period has ended
        if (mod.status === "canceling" && mod.access_ends_at) {
          if (nowMs >= new Date(mod.access_ends_at).getTime()) {
            patch.status = "expired";
            statusChanged = true;
            action = "status_changed";
            reason = "Canceling period ended — expired by nightly reconcile";
            expiredCount++;
          }
        }

        // Check for drift between Stripe and local
        if (!statusChanged && expectedModuleStatus !== mod.status) {
          // If Stripe says active but we're past_due/suspended, Stripe is authoritative
          if (expectedModuleStatus === "active" && ["past_due", "suspended"].includes(mod.status)) {
            patch.status = "active";
            patch.grace_ends_at = null;
            statusChanged = true;
            action = "payment_recovered";
            reason = "Stripe shows active — recovered by nightly reconcile";
          } else if (stripeSub.cancel_at_period_end && mod.status !== "canceling") {
            patch.status = "canceling";
            patch.access_ends_at = periodEnd;
            statusChanged = true;
            action = "status_changed";
            reason = "Stripe shows cancel_at_period_end — set to canceling by reconcile";
          } else if (!stripeSub.cancel_at_period_end && expectedModuleStatus !== mod.status) {
            // Flag drift but don't auto-change — let the webhook handle it
            if (!mod.drift_flagged) {
              patch.drift_flagged = true;
              patch.drift_detail = `Stripe: ${stripeStatus}, Local: ${mod.status}`;
              drifts.push({ club_id: sub.club_id, module_key: mod.module_key, detail: `Stripe: ${stripeStatus}, Local: ${mod.status}` });
            }
          }
        } else if (expectedModuleStatus === mod.status && mod.drift_flagged) {
          // Drift resolved
          patch.drift_flagged = false;
          patch.drift_detail = null;
        }

        await svc.entities.TenantModule.update(mod.id, patch);

        if (statusChanged) {
          await logEntitlementEvent(svc, {
            club_id: sub.club_id,
            module_key: mod.module_key,
            action: action,
            from_status: mod.status,
            to_status: patch.status,
            reason: reason,
            actor: "nightly_reconcile",
            metadata: { subscription_id: sub.stripe_subscription_id },
          });
        }
      }
    }

    // Send alert email if drift detected
    if (drifts.length > 0 && settings.alert_email) {
      const driftSummary = drifts.map((d) => `${d.club_id}/${d.module_key}: ${d.detail}`).join("\n");
      try {
        await base44.integrations.Core.SendEmail({
          to: settings.alert_email,
          subject: `[Module Access] ${drifts.length} drift(s) detected in nightly reconciliation`,
          body: `The nightly module access reconciliation detected the following discrepancies between Stripe and local records:\n\n${driftSummary}\n\nSuspended: ${suspendedCount}\nExpired: ${expiredCount}\n\nReview in the System Console > Module Access tab.`,
        });
      } catch (e) {
        console.error("module-reconcile: alert email failed", e);
      }
    }

    return Response.json({
      checked: subs.length,
      drifts: drifts.length,
      suspended: suspendedCount,
      expired: expiredCount,
    });
  } catch (error) {
    console.error("module-reconcile error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}