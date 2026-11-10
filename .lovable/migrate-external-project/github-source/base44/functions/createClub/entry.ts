// Club onboarding — creates a new tenant and makes the calling user its first club admin.
// Called by an authenticated user who does not yet belong to a club.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  try {
    const base44 = createClientFromRequest(req);

    let appUser: any = null;
    try {
      appUser = await base44.auth.me();
    } catch (_) {
      appUser = null;
    }
    if (!appUser) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }
    if (appUser.club_id) {
      return new Response(JSON.stringify({ error: "You already belong to a club" }), { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    const planTier = String(body.plan_tier ?? "free");
    const billingEmail = String(body.billing_email ?? appUser.email ?? "").trim();
    if (!name) {
      return new Response(JSON.stringify({ error: "Club name is required" }), { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Resolve plan limits from the trusted SubscriptionPlan entity.
    let maxPlayers = 50, maxBranches = 1, maxTeams = 5;
    try {
      const plans = await base44.asServiceRole.entities.SubscriptionPlan.filter({ tier: planTier, is_active: true });
      const plan = plans?.[0];
      if (plan) {
        maxPlayers = plan.max_players ?? maxPlayers;
        maxBranches = plan.max_branches ?? maxBranches;
        maxTeams = plan.max_teams ?? maxTeams;
      }
    } catch (e) {
      console.error("createClub: plan lookup failed", e);
    }

    const trialDays = 14;
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

    const club = await base44.asServiceRole.entities.Club.create({
      name,
      slug,
      club_type: "trial",
      plan_tier: planTier,
      status: "trialing",
      billing_email: billingEmail,
      max_players: maxPlayers,
      max_branches: maxBranches,
      max_teams: maxTeams,
      trial_ends_at: trialEndsAt,
      onboarded_by_user_id: appUser.id,
      is_active: true,
    });

    // Make the calling user the club admin of the new tenant.
    await base44.auth.updateMe({ club_id: club.id, custom_role: "club_admin" });

    // Seed the setup-wizard progress so the Layout gating triggers the
    // ClubSetupWizard → MigrationWizard flow for this new tenant.
    await base44.asServiceRole.entities.ClubSetupProgress.create({ club_id: club.id }).catch(() => {});

    return new Response(JSON.stringify({ club }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("createClub: unhandled error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});