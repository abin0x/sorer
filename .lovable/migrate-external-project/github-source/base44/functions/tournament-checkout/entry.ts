import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { getStripeSecretKey } from "../../shared/clubCredentials.ts";

// Public: creates a TournamentRegistration (pending) and a Stripe Checkout
// Session for the entry fee on the organizing club's own Stripe account.
// Supports guest checkout (no login required).
//
// Input:
//   tournament_id
//   team: { name, contact_name, contact_email, contact_phone, city, state, roster_count, notes }
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { tournament_id, team } = body;

    if (!tournament_id)
      return Response.json({ error: "Missing tournament_id" }, { status: 400 });
    if (!team?.name || !team?.contact_email)
      return Response.json(
        { error: "Team name and contact email are required" },
        { status: 400 }
      );

    const tournament = await svc.entities.Tournament.get(tournament_id).catch(
      () => null
    );
    if (!tournament)
      return Response.json({ error: "Tournament not found" }, { status: 404 });
    if (tournament.status !== "registration_open")
      return Response.json(
        { error: "Registration is not open for this tournament" },
        { status: 400 }
      );

    const entryFee = Number(tournament.entry_fee || 0);

    // Create the registration record (pending)
    const reg = await svc.entities.TournamentRegistration.create({
      tournament_id,
      club_id: tournament.club_id,
      team_name: team.name,
      team_contact_name: team.contact_name || "",
      team_contact_email: team.contact_email,
      team_contact_phone: team.contact_phone || "",
      coach_name: team.coach_name || "",
      team_city: team.city || "",
      team_state: team.state || "",
      age_group: tournament.age_group || "",
      gender: tournament.gender || "Coed",
      roster_count: Number(team.roster_count || 0),
      notes: team.notes || "",
      entry_fee: entryFee,
      payment_status: "pending",
      status: "pending",
      registered_at: new Date().toISOString(),
    });

    // Free tournament — approve immediately, no Stripe session needed
    if (entryFee < 0.5) {
      await svc.entities.TournamentRegistration.update(reg.id, {
        payment_status: "paid",
        status: "approved",
      });
      // Bump the tournament's registered_count
      await svc.entities.Tournament.update(tournament.id, {
        registered_count: (tournament.registered_count || 0) + 1,
      }).catch(() => {});
      return Response.json({
        checkout_url: null,
        registration_id: reg.id,
        free: true,
      });
    }

    // Paid tournament — create Stripe Checkout Session
    const secretKey = await getStripeSecretKey(base44, tournament.club_id);
    if (!secretKey) {
      await svc.entities.TournamentRegistration.update(reg.id, {
        payment_status: "failed",
      });
      return Response.json(
        { error: "Online payment is not available for this tournament yet." },
        { status: 400 }
      );
    }

    const appUrl =
      req.headers.get("X-Base44-App-Url") ||
      process.env.WIX_CHECKOUT_APP_URL ||
      "";
    const base = appUrl.replace(/\/$/, "");
    if (!base) {
      await svc.entities.TournamentRegistration.update(reg.id, {
        payment_status: "failed",
      });
      return Response.json(
        { error: "Could not determine app URL for checkout redirect" },
        { status: 500 }
      );
    }

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append(
      "success_url",
      `${base}/TournamentRegistration?tournament=${tournament_id}&step=confirmation&reg=${reg.id}`
    );
    params.append(
      "cancel_url",
      `${base}/TournamentRegistration?tournament=${tournament_id}&canceled=1`
    );
    params.append("metadata[source_type]", "tournament_registration");
    params.append("metadata[registration_id]", reg.id);
    params.append("metadata[tournament_id]", tournament_id);
    params.append("metadata[club_id]", tournament.club_id);
    if (team.contact_email) params.append("customer_email", team.contact_email);

    params.append("line_items[0][quantity]", "1");
    params.append("line_items[0][price_data][currency]", "usd");
    params.append(
      "line_items[0][price_data][unit_amount]",
      String(Math.round(entryFee * 100))
    );
    params.append(
      "line_items[0][price_data][product_data][name]",
      `${tournament.name} — Team Entry Fee`
    );

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });
    const session = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("tournament-checkout: stripe error", session);
      await svc.entities.TournamentRegistration.update(reg.id, {
        payment_status: "failed",
      });
      return Response.json(
        { error: session?.error?.message || "Could not start checkout" },
        { status: 400 }
      );
    }

    await svc.entities.TournamentRegistration.update(reg.id, {
      stripe_checkout_session_id: session.id,
    });

    return Response.json({
      checkout_url: session.url,
      registration_id: reg.id,
    });
  } catch (error) {
    console.error("tournament-checkout error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}