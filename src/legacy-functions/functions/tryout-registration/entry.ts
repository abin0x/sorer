// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { getStripeSecretKey } from '../../shared/clubCredentials.ts';
import {
  todayIso, eligibilityFor, registrationWindow, changeWindow, refundOnCancel, sessionSpots,
  countOccupying, tryoutFee, promoDiscount, splitDiscount, money,
} from '../../shared/tryoutEligibility.ts';
import { sendTryoutConfirmation } from '../../shared/tryoutEmails.ts';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';

/**
 * Parent tryout registration.
 *
 * Eligibility, capacity, fees and promo codes are all resolved here — never by
 * the browser — so a family can only register a genuinely eligible player into
 * a session with room, at the price the club set. Payment runs on the club's
 * own Stripe account; the confirmation is written by club-stripe-webhook once
 * Stripe confirms the money, and by this function when nothing is owed.
 *
 * Actions: family · promo · checkout · status · reschedule · cancel ·
 *          financial_aid · admin_mark_paid · admin_waive · admin_financial_aid ·
 *          admin_move · admin_cancel · admin_refund_recorded
 */

const OCCUPYING_FOR_COUNT = ['registered', 'waitlist', 'pending_payment', 'checked_in', 'no_show'];
const ADMIN_ROLES = ['master_admin', 'admin', 'club_director', 'club_admin', 'branch_director', 'branch_admin'];
const SESSION_LABEL = { main_tryout: 'Main Club Tryout', open_training: 'Open Training', supplemental_tryout: 'Supplemental Tryout' };

const clubOf = (u: any) => u?.data?.club_id || u?.club_id || '';
const isClubAdmin = (u: any) => !!u && (u.role === 'admin' || u.is_super_admin === true || ADMIN_ROLES.includes(u.custom_role || ''));

const planView = (p: any) => ({
  id: p.id, title: p.title, age_group: p.age_group || '', gender: p.gender || '', format: p.format || '',
  season: p.season || '', tryout_fee: Number(p.tryout_fee || 0), max_capacity: Number(p.max_capacity || 0),
  registration_open_date: p.registration_open_date || '', registration_close_date: p.registration_close_date || '',
  change_deadline: p.change_deadline || '', refund_policy: p.refund_policy || '',
  required_documents: p.required_documents || [],
});

const sessionView = (e: any, regs: any[]) => {
  const spots = sessionSpots(e, regs.filter((r: any) => r.tryout_event_id === e.id));
  return {
    id: e.id, type: e.type, label: SESSION_LABEL[e.type] || 'Session',
    date: e.date, start_time: e.start_time || '', end_time: e.end_time || '',
    field_name: e.field_name || e.location || '', branch_name: e.branch_name || '',
    capacity: spots.capacity, taken: spots.taken, spots_left: spots.spots_left, waitlist: spots.waitlist,
  };
};

const code = () => Math.random().toString(36).slice(2, 8).toUpperCase();

/** The tryout's age rules for its season, its sessions and every registration. */
async function planContext(svc: any, planId: string) {
  const plan = await svc.TryoutPlan.get(planId).catch(() => null);
  if (!plan) return null;
  const events = await svc.TryoutEvent.filter({ tryout_plan_id: planId }, 'date', 200);
  const eventIds = events.map((e: any) => e.id);
  const [ageGroups, regs] = await Promise.all([
    plan.season ? svc.AgeGroup.filter({ club_id: plan.club_id, season_name: plan.season }, 'order', 200) : Promise.resolve([]),
    eventIds.length ? svc.TryoutRegistration.filter({ tryout_event_id: { $in: eventIds } }, null, 3000) : Promise.resolve([]),
  ]);
  return { plan, events, ageGroups, regs };
}

/** Keeps TryoutEvent.registration_count in step with the real registrations. */
async function refreshEventCount(svc: any, eventId: string) {
  const regs = await svc.TryoutRegistration.filter({ tryout_event_id: eventId }, null, 1000).catch(() => []);
  const registered = regs.filter((r: any) => OCCUPYING_FOR_COUNT.includes(r.status) && r.status !== 'waitlist').length;
  await svc.TryoutEvent.update(eventId, { registration_count: registered }).catch(() => {});
  return registered;
}

/** Frees a spot and hands it to the family waiting longest. */
async function promoteFromWaitlist(svc: any, eventId: string) {
  const regs = await svc.TryoutRegistration.filter({ tryout_event_id: eventId }, 'created_date', 1000).catch(() => []);
  const next = regs.find((r: any) => r.status === 'waitlist');
  if (!next) return null;
  await svc.TryoutRegistration.update(next.id, { status: 'registered' });
  await svc.Notification.create({
    club_id: next.club_id, user_email: next.guardian_email, type: 'announcement',
    title: 'A tryout spot opened up',
    message: `${next.player_name} has been moved off the waitlist and is now registered for the tryout.`,
  }).catch(() => {});
  return next.player_name;
}

/** One place that finds or saves a family profile. */
async function upsertGuardian(svc: any, clubId: string, form: any, me: any) {
  const email = String(form.email || '').trim().toLowerCase();
  let guardian = (await svc.Guardian.filter({ club_id: clubId, email }, null, 1))[0]
    || (await svc.Guardian.filter({ email }, null, 1))[0]
    || null;
  const patch: any = {
    first_name: form.first_name, last_name: form.last_name, email,
    phone: form.phone || guardian?.phone || '',
    relationship: form.relationship || guardian?.relationship || 'guardian',
    street_address: form.street_address || guardian?.street_address || '',
    city: form.city || guardian?.city || '',
    state: form.state || guardian?.state || '',
    zip_code: form.zip_code || guardian?.zip_code || '',
  };
  if (guardian) {
    guardian = await svc.Guardian.update(guardian.id, patch);
  } else {
    const parts = String(form.first_name || '').trim().split(' ');
    guardian = await svc.Guardian.create({
      club_id: clubId, ...patch,
      first_name: parts[0] || form.first_name,
      last_name: form.last_name || parts.slice(1).join(' '),
      user_id: me?.id || form.user_id || undefined,
    });
  }
  if (!guardian.user_id && (me?.id || form.user_id)) {
    await svc.Guardian.update(guardian.id, { user_id: me?.id || form.user_id }).catch(() => {});
  }
  return guardian;
}

/** One confirmation email per family, covering every player in the checkout. */
async function confirmFamily(svc: any, base44: any, regs: any[], appUrl: string) {
  if (!regs.length) return;
  const email = regs[0].guardian_email;
  const siblings = email
    ? regs.filter((r) => (r.guardian_email || '').toLowerCase() === email.toLowerCase())
    : regs;
  const sessions: any = {};
  await Promise.all([...new Set(siblings.map((r) => r.tryout_event_id).filter(Boolean))].map(async (id) => {
    sessions[id] = await svc.TryoutEvent.get(id).catch(() => ({}));
  }));
  const plan = siblings[0]?.tryout_plan_id ? await svc.TryoutPlan.get(siblings[0].tryout_plan_id).catch(() => null) : null;
  const totals = {
    total: money(siblings.reduce((s, r) => s + Number(r.amount_paid || 0), 0)),
    discount: money(siblings.reduce((s, r) => s + Number(r.discount_amount || 0), 0)),
  };
  if (email) {
    await sendTryoutConfirmation(base44, { email, registrations: siblings, sessions, plan, totals, appUrl }).catch((e) => {
      console.error('tryout confirmation email failed:', e?.message || e);
    });
  }
  await svc.Notification.create({
    club_id: siblings[0].club_id, user_email: email, type: 'announcement',
    title: siblings.length > 1 ? 'Tryout registrations confirmed' : 'Tryout registration confirmed',
    message: `${siblings.map((r) => r.player_name).join(', ')} — ${plan?.title || 'tryout'}${totals.total > 0 ? ` · $${totals.total.toFixed(2)} paid` : ''}.`,
  }).catch(() => {});
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const { action } = body;
    const today = todayIso();
    const me: any = await base44.auth.me().catch(() => null);

    const appUrl = (req.headers.get('X-Base44-App-Url') || process.env.WIX_CHECKOUT_APP_URL || '').replace(/\/$/, '');

    // ================= Family profile + eligible tryouts =================
    if (action === 'family') {
      const { club_id } = body;
      const email = String(body.email || '').trim().toLowerCase();
      if (!club_id || !email) return Response.json({ error: 'club_id and email are required' }, { status: 400 });

      const club = await svc.Club.get(club_id).catch(() => null);
      const guardian = (await svc.Guardian.filter({ club_id, email }, null, 1))[0]
        || (await svc.Guardian.filter({ email }, null, 1))[0]
        || null;

      let children: any[] = [];
      if (guardian) {
        const [direct, linked] = await Promise.all([
          svc.Player.filter({ guardian_id: guardian.id }, 'first_name', 50).catch(() => []),
          svc.Player.filter({ guardian_ids: { $in: [guardian.id] } }, 'first_name', 50).catch(() => []),
        ]);
        const seen = new Set<string>();
        children = [...direct, ...linked].filter((p: any) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
      }

      // Open tryouts, with the age rules needed to test each child.
      const allPlans = await svc.TryoutPlan.filter({ club_id }, 'start_date', 200);
      const plans: any[] = [];
      const ageGroupsBySeason: Record<string, any[]> = {};
      for (const plan of allPlans) {
        if (!registrationWindow(plan, today).open) continue;
        const ctx = await planContext(svc, plan.id);
        if (!ctx) continue;
        const upcoming = ctx.events.filter((e: any) => e.date >= today);
        if (!upcoming.length) continue;
        ageGroupsBySeason[plan.id] = ctx.ageGroups;
        plans.push({ ...planView(plan), sessions: upcoming.map((e: any) => sessionView(e, ctx.regs)) });
      }

      const kids = children.map((child: any) => ({
        id: child.id, first_name: child.first_name, last_name: child.last_name,
        date_of_birth: child.date_of_birth || '', gender: child.gender || '',
        team_name: child.team_name || '', current_age_group: child.age_group || '',
        eligibility: plans.map((plan: any) => {
          const check = eligibilityFor(child, plan, ageGroupsBySeason[plan.id] || []);
          return { plan_id: plan.id, eligible: check.eligible, reason: check.reason, age_group: check.age_group || '' };
        }),
      }));

      return Response.json({ club: club ? { id: club.id, name: club.name } : null, guardian, children: kids, plans });
    }

    // ================= Promo code =================
    if (action === 'promo') {
      const { club_id, code: input, subtotal } = body;
      const normalized = String(input || '').trim().toUpperCase();
      if (!club_id || !normalized) return Response.json({ error: 'Enter a code' }, { status: 400 });
      const promo = (await svc.PromoCode.filter({ club_id, code: normalized }, null, 1))[0] || null;
      const result = promoDiscount(promo, Number(subtotal || 0), today);
      if (result.error) return Response.json({ valid: false, message: result.error });
      return Response.json({ valid: true, discount: result.discount, code: normalized, message: `Code ${normalized} applied` });
    }

    // ================= Save a player to the family profile =================
    if (action === 'add_child') {
      const { club_id, guardian: form = {}, child = {} } = body;
      const email = String(form.email || '').trim().toLowerCase();
      if (!club_id || !email || !form.first_name || !form.last_name) {
        return Response.json({ error: 'Your name and email are required first' }, { status: 400 });
      }
      if (!child.first_name || !child.last_name || !child.date_of_birth) {
        return Response.json({ error: 'A player needs a first name, last name and date of birth' }, { status: 400 });
      }
      const guardian = await upsertGuardian(svc, club_id, form, me);
      const kids = await svc.Player.filter({ guardian_id: guardian.id }, null, 100).catch(() => []);
      const name = (p: any) => `${p.first_name} ${p.last_name}`.trim().toLowerCase();
      let player = kids.find((p: any) => name(p) === `${child.first_name} ${child.last_name}`.trim().toLowerCase()
        && p.date_of_birth === child.date_of_birth) || null;
      if (!player) {
        player = await svc.Player.create({
          club_id, first_name: child.first_name, last_name: child.last_name,
          date_of_birth: child.date_of_birth, gender: child.gender || undefined,
          guardian_id: guardian.id, guardian_ids: [guardian.id],
          guardian_name: `${form.first_name} ${form.last_name}`.trim(), status: 'pending',
        });
      }
      return Response.json({ ok: true, child_id: player.id, guardian_id: guardian.id });
    }

    // ================= Register + pay =================
    if (action === 'checkout') {
      const { club_id, guardian: form = {}, items = [], promo_code, financial_aid, financial_aid_note, utm_source, utm_campaign } = body;
      const email = String(form.email || '').trim().toLowerCase();
      if (!club_id) return Response.json({ error: 'Missing club' }, { status: 400 });
      if (!email || !form.first_name || !form.last_name) {
        return Response.json({ error: 'Parent name and email are required' }, { status: 400 });
      }
      if (!Array.isArray(items) || !items.length) return Response.json({ error: 'Add at least one player' }, { status: 400 });

      const club = await svc.Club.get(club_id).catch(() => null);
      if (!club) return Response.json({ error: 'Club not found' }, { status: 404 });

      // Saved family profile — reuse the guardian, refresh what they retyped.
      const guardian = await upsertGuardian(svc, club_id, form, me);

      const groupId = `try-${Date.now()}-${code().toLowerCase()}`;
      const prepared: any[] = [];

      for (const item of items) {
        const ctx = await planContext(svc, item.plan_id);
        if (!ctx) return Response.json({ error: 'That tryout is no longer available' }, { status: 400 });
        const window = registrationWindow(ctx.plan, today);
        if (!window.open) return Response.json({ error: `${ctx.plan.title}: ${window.reason}` }, { status: 400 });

        const event = ctx.events.find((e: any) => e.id === item.event_id);
        if (!event) return Response.json({ error: 'Pick a session for every player' }, { status: 400 });
        if (event.date < today) return Response.json({ error: `The ${event.date} session has already taken place — pick another` }, { status: 400 });

        // Player: reuse the family's existing child, otherwise create them.
        let player = item.player_id ? await svc.Player.get(item.player_id).catch(() => null) : null;
        if (!player && item.player) {
          const kids = await svc.Player.filter({ guardian_id: guardian.id }, null, 100).catch(() => []);
          player = kids.find((p: any) => `${p.first_name} ${p.last_name}`.trim().toLowerCase()
            === `${item.player.first_name} ${item.player.last_name}`.trim().toLowerCase()
            && (!item.player.date_of_birth || p.date_of_birth === item.player.date_of_birth)) || null;
          if (!player) {
            const fullName = `${item.player.first_name || ''} ${item.player.last_name || ''}`.trim();
            if (!fullName || !item.player.date_of_birth) {
              return Response.json({ error: 'Every player needs a first name, last name and date of birth' }, { status: 400 });
            }
            player = await svc.Player.create({
              club_id, first_name: item.player.first_name, last_name: item.player.last_name,
              date_of_birth: item.player.date_of_birth, gender: item.player.gender || undefined,
              guardian_id: guardian.id, guardian_ids: [guardian.id],
              guardian_name: `${form.first_name} ${form.last_name}`.trim(),
              status: 'pending', season: ctx.plan.season || undefined,
            });
          }
        }
        if (!player) return Response.json({ error: 'Player not found' }, { status: 400 });

        const check = eligibilityFor(player, ctx.plan, ctx.ageGroups);
        if (!check.eligible) {
          return Response.json({ error: `${player.first_name} ${player.last_name}: ${check.reason}` }, { status: 400 });
        }

        // Waivers + e-signature.
        const accepted: string[] = (item.waiver?.accepted_documents || []).map((n: any) => String(n));
        const documents = (ctx.plan.required_documents || []).map((d: any) => ({
          name: d.name, required: d.required !== false, notes: d.notes || '', accepted: accepted.includes(d.name),
        }));
        const missing = documents.filter((d: any) => d.required && !d.accepted);
        if (missing.length) {
          return Response.json({ error: `${player.first_name}: please accept "${missing[0].name}"` }, { status: 400 });
        }
        if (!item.waiver?.signature || !String(item.waiver.signature).trim()) {
          return Response.json({ error: `A guardian signature is required for ${player.first_name}` }, { status: 400 });
        }

        const sessionRegs = ctx.regs.filter((r: any) => r.tryout_event_id === event.id);
        const occupied = countOccupying(sessionRegs);
        if (ctx.plan.max_capacity && occupied >= ctx.plan.max_capacity) {
          return Response.json({ error: `${ctx.plan.title} is at capacity — join the waitlist or contact the club` }, { status: 400 });
        }
        const spots = sessionSpots(event, sessionRegs);

        // The rollover pool already has a record for this player — upgrade it
        // rather than creating a second one for the same season.
        const pooled = ctx.plan.season
          ? (await svc.TryoutRegistration.filter({
            club_id, player_id: player.id, season_name: ctx.plan.season, status: 'pooled',
          }, null, 5).catch(() => []))[0] || null
          : null;

        // Siblings in one checkout must not both take the same last spot.
        const already = prepared.filter((x: any) => x.event.id === event.id).length;
        prepared.push({
          plan: ctx.plan, event, player, age: check.age_group || player.age_group || '',
          fee: tryoutFee(ctx.plan), documents, pooled,
          signature: String(item.waiver.signature).trim(),
          waitlist: spots.capacity > 0 && occupied + already >= spots.capacity,
        });
      }

      // Money: one fee per player, the code applied across the group.
      const fees = prepared.map((p) => p.fee);
      const subtotal = money(fees.reduce((s, f) => s + f, 0));
      let promo: any = null;
      let discount = 0;
      if (promo_code) {
        promo = (await svc.PromoCode.filter({ club_id, code: String(promo_code).trim().toUpperCase() }, null, 1))[0] || null;
        const result = promoDiscount(promo, subtotal, today);
        if (result.error) return Response.json({ error: result.error }, { status: 400 });
        discount = result.discount;
      }
      const shares = splitDiscount(fees, discount);

      const created: any[] = [];
      for (let i = 0; i < prepared.length; i += 1) {
        const p = prepared[i];
        const planTitle = p.plan.title;
        const due = money(p.fee - shares[i]);
        const aid = !!financial_aid;
        // A waitlisted player owes nothing today; a covered fee needs no charge.
        const chargeable = !aid && !p.waitlist && due >= 0.5;
        const covered = !aid && !p.waitlist && due < 0.5;
        const payload: any = {
          club_id,
          tryout_plan_id: p.plan.id,
          tryout_event_id: p.event.id,
          season_id: p.plan.season_id || '',
          season_name: p.plan.season || '',
          player_id: p.player.id,
          player_name: `${p.player.first_name} ${p.player.last_name}`.trim(),
          player_date_of_birth: p.player.date_of_birth || '',
          player_gender: p.player.gender || '',
          guardian_id: guardian.id,
          guardian_name: `${form.first_name} ${form.last_name}`.trim(),
          guardian_email: email,
          guardian_phone: form.phone || '',
          user_id: me?.id || form.user_id || '',
          desired_age_group: p.age,
          session_date: p.event.date,
          session_start_time: p.event.start_time || '',
          session_field_name: p.event.field_name || p.event.location || '',
          branch_id: p.event.branch_id || '',
          branch_name: p.event.branch_name || '',
          registered_date: today,
          status: p.waitlist ? 'waitlist' : (chargeable ? 'pending_payment' : 'registered'),
          pool_status: 'registered',
          payment_status: aid ? 'financial_aid_pending' : p.waitlist ? 'unpaid' : chargeable ? 'pending' : 'waived',
          waiver_status: 'signed',
          waiver_signature: p.signature,
          waiver_signed_by: email,
          waiver_signed_at: new Date().toISOString(),
          waiver_documents: p.documents,
          fee_amount: p.fee,
          discount_amount: shares[i],
          amount_due: due,
          amount_paid: 0,
          currency: 'USD',
          promo_code: promo ? promo.code : '',
          checkout_group_id: groupId,
          financial_aid_requested: aid,
          financial_aid_status: aid ? 'requested' : 'none',
          financial_aid_note: aid ? (financial_aid_note || '') : '',
          refund_status: 'none',
          check_in_code: p.pooled?.check_in_code || code(),
          source: 'outside',
          utm_source: utm_source || '',
          utm_campaign: utm_campaign || '',
          notes: p.waitlist ? 'Session was full — on the waitlist' : '',
        };
        const reg = p.pooled
          ? await svc.TryoutRegistration.update(p.pooled.id, payload)
          : await svc.TryoutRegistration.create(payload);
        created.push({ ...reg, _chargeable: chargeable, _covered: covered, _plan_title: planTitle });
        if (!chargeable) await refreshEventCount(svc, p.event.id);
      }

      const toCharge = created.filter((r: any) => r._chargeable);
      const totalCharge = money(toCharge.reduce((s, r: any) => s + Number(r.amount_due || 0), 0));

      // Nothing owed (free tryout, waived code, aid request or waitlist only).
      if (totalCharge < 0.5) {
        await confirmFamily(svc, base44, created, appUrl);
        return Response.json({
          confirmed: true, group_id: groupId,
          registration_ids: created.map((r: any) => r.id), total: 0,
          registrations: created.map((r: any) => ({ id: r.id, player_name: r.player_name, status: r.status, payment_status: r.payment_status, check_in_code: r.check_in_code })),
        });
      }

      const secretKey = await getStripeSecretKey(base44, club_id);
      if (!secretKey) {
        await svc.TryoutRegistration.bulkUpdate(created.map((r: any) => ({ id: r.id, payment_status: 'failed' })));
        return Response.json({ error: 'Online payment is not available for this club yet. Please contact the club to pay another way.' }, { status: 400 });
      }
      if (!appUrl) {
        return Response.json({ error: 'Could not determine the app URL for the payment redirect' }, { status: 500 });
      }

      const params = new URLSearchParams();
      params.append('mode', 'payment');
      params.append('success_url', `${appUrl}/TryoutRegister?step=confirmation&group=${groupId}&club=${club_id}`);
      params.append('cancel_url', `${appUrl}/TryoutRegister?club=${club_id}&canceled=1`);
      params.append('metadata[source_type]', 'tryout_registration');
      params.append('metadata[source_id]', created[0].id);
      params.append('metadata[registration_ids]', created.map((r: any) => r.id).join(','));
      params.append('metadata[amounts]', created.map((r: any) => String(r._chargeable ? Number(r.amount_due || 0) : 0)).join(','));
      params.append('metadata[group_id]', groupId);
      params.append('metadata[club_id]', club_id);
      if (promo) {
        params.append('metadata[promo_code]', promo.code);
        params.append('metadata[discount_amount]', String(discount));
      }
      if (email) params.append('customer_email', email);

      toCharge.forEach((reg: any, idx: number) => {
        const prefix = `line_items[${idx}]`;
        params.append(`${prefix}[quantity]`, '1');
        params.append(`${prefix}[price_data][currency]`, 'usd');
        params.append(`${prefix}[price_data][unit_amount]`, String(Math.round(Number(reg.amount_due) * 100)));
        params.append(`${prefix}[price_data][product_data][name]`, `${reg.player_name} — ${reg._plan_title || 'Tryout fee'}`);
      });

      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const session = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('tryout-registration: stripe error', session);
        await svc.TryoutRegistration.bulkUpdate(created.map((r: any) => ({ id: r.id, payment_status: 'failed' })));
        return Response.json({ error: session?.error?.message || 'Could not start the payment' }, { status: 400 });
      }

      await svc.TryoutRegistration.bulkUpdate(
        created.map((r: any) => ({ id: r.id, stripe_checkout_session_id: session.id, stripe_checkout_url: session.url })),
      );

      return Response.json({
        checkout_url: session.url, group_id: groupId, total: totalCharge,
        registration_ids: created.map((r: any) => r.id),
        registrations: created.map((r: any) => ({ id: r.id, player_name: r.player_name, status: r.status, amount_due: r.amount_due, check_in_code: r.check_in_code })),
      });
    }

    // ================= Parent status =================
    if (action === 'status') {
      const { club_id, email, ids, group_id } = body;
      let regs: any[] = [];
      if (Array.isArray(ids) && ids.length) {
        regs = await svc.TryoutRegistration.filter({ id: { $in: ids } }, '-created_date', 100);
      } else if (group_id) {
        regs = await svc.TryoutRegistration.filter({ checkout_group_id: group_id }, '-created_date', 100);
      } else if (email) {
        regs = await svc.TryoutRegistration.filter({ club_id, guardian_email: String(email).trim().toLowerCase() }, '-created_date', 200);
      } else {
        return Response.json({ error: 'Provide an email or a registration' }, { status: 400 });
      }

      const club = regs[0]?.club_id ? await svc.Club.get(regs[0].club_id).catch(() => null) : (club_id ? await svc.Club.get(club_id).catch(() => null) : null);
      const details = [];
      for (const reg of regs) {
        if (reg.status === 'pooled') continue;
        const plan = reg.tryout_plan_id ? await svc.TryoutPlan.get(reg.tryout_plan_id).catch(() => null) : null;
        const session = reg.tryout_event_id ? await svc.TryoutEvent.get(reg.tryout_event_id).catch(() => null) : null;
        const change = changeWindow(plan, session, today);
        const refund = refundOnCancel(reg, plan, session, today);
        let alternatives: any[] = [];
        if (plan && change.allowed) {
          const ctx = await planContext(svc, plan.id);
          alternatives = (ctx?.events || [])
            .filter((e: any) => e.id !== reg.tryout_event_id && e.date >= today)
            .map((e: any) => sessionView(e, ctx.regs));
        }
        // Only what the family needs to see — never the raw record.
        details.push({
          id: reg.id,
          player_name: reg.player_name,
          player_id: reg.player_id,
          status: reg.status,
          pool_status: reg.pool_status,
          payment_status: reg.payment_status,
          waiver_status: reg.waiver_status,
          fee_amount: Number(reg.fee_amount || 0),
          discount_amount: Number(reg.discount_amount || 0),
          amount_due: Number(reg.amount_due || 0),
          amount_paid: Number(reg.amount_paid || 0),
          promo_code: reg.promo_code || '',
          financial_aid_requested: !!reg.financial_aid_requested,
          financial_aid_status: reg.financial_aid_status || 'none',
          refund_status: reg.refund_status || 'none',
          refund_amount: Number(reg.refund_amount || 0),
          refunded_at: reg.refunded_at || '',
          cancelled_at: reg.cancelled_at || '',
          check_in_code: reg.check_in_code || '',
          session_date: reg.session_date || '',
          session_start_time: reg.session_start_time || '',
          session_field_name: reg.session_field_name || '',
          desired_age_group: reg.desired_age_group || '',
          guardian_email: reg.guardian_email || '',
          checkout_group_id: reg.checkout_group_id || '',
          plan_title: plan?.title || '',
          season: plan?.season || reg.season_name || '',
          refund_policy: plan?.refund_policy || '',
          session: session ? sessionView(session, await svc.TryoutRegistration.filter({ tryout_event_id: session.id }, null, 500).catch(() => [])) : null,
          change: { allowed: change.allowed, deadline: change.deadline },
          refund_on_cancel: refund,
          alternative_sessions: alternatives,
        });
      }
      return Response.json({
        club: club ? { id: club.id, name: club.name } : null,
        registrations: details,
        total_paid: money(details.reduce((s, r: any) => s + Number(r.amount_paid || 0), 0)),
        refund_due: money(details.filter((r: any) => r.refund_status === 'due').reduce((s, r: any) => s + Number(r.refund_amount || 0), 0)),
      });
    }

    // ================= Move a registration to another session =================
    if (action === 'reschedule' || action === 'admin_move') {
      const { registration_id, event_id } = body;
      const reg = await svc.TryoutRegistration.get(registration_id).catch(() => null);
      if (!reg) return Response.json({ error: 'Registration not found' }, { status: 404 });
      const admin = action === 'admin_move';
      if (admin) {
        if (!isClubAdmin(me)) return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
        if (clubOf(me) && clubOf(me) !== reg.club_id && me.role !== 'admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
      } else if (reg.status === 'cancelled') {
        return Response.json({ error: 'This registration was cancelled' }, { status: 400 });
      } else if (String(body.email || '').trim().toLowerCase() !== (reg.guardian_email || '').toLowerCase()) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const plan = reg.tryout_plan_id ? await svc.TryoutPlan.get(reg.tryout_plan_id).catch(() => null) : null;
      const from = reg.tryout_event_id ? await svc.TryoutEvent.get(reg.tryout_event_id).catch(() => null) : null;
      if (!admin) {
        const change = changeWindow(plan, from, today);
        if (!change.allowed) {
          return Response.json({ error: `Sessions can no longer be changed${change.deadline ? ` (the deadline was ${change.deadline})` : ''}. Contact the club directly.` }, { status: 400 });
        }
      }

      const target = await svc.TryoutEvent.get(event_id).catch(() => null);
      if (!target) return Response.json({ error: 'Session not found' }, { status: 404 });
      if (plan && target.tryout_plan_id !== plan.id) return Response.json({ error: 'That session belongs to another tryout' }, { status: 400 });
      if (target.date < today) return Response.json({ error: 'That session has already taken place' }, { status: 400 });
      if (target.id === reg.tryout_event_id) return Response.json({ ok: true, registration: reg });

      const targetRegs = await svc.TryoutRegistration.filter({ tryout_event_id: target.id }, null, 1000).catch(() => []);
      const spots = sessionSpots(target, targetRegs);
      const status = spots.waitlist ? 'waitlist' : (reg.status === 'waitlist' ? 'registered' : reg.status);

      const history = [...(reg.reschedule_history || []), {
        at: new Date().toISOString(), by: me?.email || 'family',
        from_event_id: reg.tryout_event_id, from_date: reg.session_date || '',
        to_event_id: target.id, to_date: target.date,
      }];

      const updated = await svc.TryoutRegistration.update(reg.id, {
        tryout_event_id: target.id,
        session_date: target.date,
        session_start_time: target.start_time || '',
        session_field_name: target.field_name || target.location || '',
        branch_id: target.branch_id || '',
        branch_name: target.branch_name || '',
        status,
        reschedule_history: history,
      });
      if (from) {
        await refreshEventCount(svc, from.id);
        const promoted = await promoteFromWaitlist(svc, from.id);
        if (promoted) console.log('tryout reschedule freed a spot for', promoted);
      }
      await refreshEventCount(svc, target.id);
      return Response.json({ ok: true, registration: updated, waitlisted: spots.waitlist });
    }

    // ================= Cancel a spot =================
    if (action === 'cancel' || action === 'admin_cancel') {
      const { registration_id, reason } = body;
      const reg = await svc.TryoutRegistration.get(registration_id).catch(() => null);
      if (!reg) return Response.json({ error: 'Registration not found' }, { status: 404 });
      if (reg.status === 'cancelled') return Response.json({ ok: true, registration: reg, refund: { due: false, amount: 0 } });
      if (action === 'cancel' && String(body.email || '').trim().toLowerCase() !== (reg.guardian_email || '').toLowerCase()) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const admin = action === 'admin_cancel';
      if (admin) {
        if (!isClubAdmin(me)) return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
        if (clubOf(me) && clubOf(me) !== reg.club_id && me.role !== 'admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
      }

      const plan = reg.tryout_plan_id ? await svc.TryoutPlan.get(reg.tryout_plan_id).catch(() => null) : null;
      const session = reg.tryout_event_id ? await svc.TryoutEvent.get(reg.tryout_event_id).catch(() => null) : null;
      const refund = refundOnCancel(reg, plan, session, today);
      if (!admin && !changeWindow(plan, session, today).allowed) {
        return Response.json({ error: 'This spot can no longer be cancelled online. Please contact the club directly.' }, { status: 400 });
      }

      // Don't leave a payable link open on a cancelled spot.
      if (reg.stripe_checkout_session_id && reg.payment_status !== 'paid') {
        const secretKey = await getStripeSecretKey(base44, reg.club_id).catch(() => null);
        if (secretKey) {
          await fetch(`https://api.stripe.com/v1/checkout/sessions/${reg.stripe_checkout_session_id}/expire`, {
            method: 'POST', headers: { Authorization: `Bearer ${secretKey}` },
          }).catch(() => {});
        }
      }

      const patch: any = {
        status: 'cancelled',
        pool_status: 'withdrawn',
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason || (admin ? `Cancelled by ${me?.email || 'club admin'}` : 'Cancelled by the family'),
      };
      if (refund.due) {
        patch.refund_status = 'due';
        patch.refund_amount = refund.amount;
      }
      const updated = await svc.TryoutRegistration.update(reg.id, patch);
      let promoted = null;
      if (session) {
        await refreshEventCount(svc, session.id);
        if (reg.status !== 'waitlist') promoted = await promoteFromWaitlist(svc, session.id);
      }
      return Response.json({ ok: true, registration: updated, refund, promoted });
    }

    // ================= Financial aid request =================
    if (action === 'financial_aid') {
      const ids: string[] = body.registration_ids || [];
      const note = String(body.note || '');
      const email = String(body.email || '').trim().toLowerCase();
      if (!ids.length) return Response.json({ error: 'No registration to update' }, { status: 400 });
      // Only the family that owns the registration (or a club admin) may ask.
      const owned = [];
      for (const id of ids) {
        const row = await svc.TryoutRegistration.get(id).catch(() => null);
        if (!row) continue;
        if (isClubAdmin(me) || (email && (row.guardian_email || '').toLowerCase() === email)) owned.push(id);
      }
      if (!owned.length) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const updated = await Promise.all(owned.map((id) => svc.TryoutRegistration.update(id, {
        financial_aid_requested: true,
        financial_aid_status: 'requested',
        financial_aid_note: note,
        payment_status: 'financial_aid_pending',
      }).catch(() => null)));
      return Response.json({ ok: true, registrations: updated.filter(Boolean) });
    }

    // ================= Admin: register a player on a family's behalf =================
    if (action === 'admin_add_player') {
      if (!isClubAdmin(me)) return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
      const { club_id, plan_id, event_id, player: child = {}, guardian: form = {}, waiver = {}, payment = 'later', method, reference } = body;
      if (!club_id) return Response.json({ error: 'Missing club' }, { status: 400 });
      if (clubOf(me) && clubOf(me) !== club_id && me.role !== 'admin' && me.is_super_admin !== true) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const email = String(form.email || '').trim().toLowerCase();
      if (!email || !form.first_name || !form.last_name) {
        return Response.json({ error: "The family's name and email are required" }, { status: 400 });
      }

      const ctx = await planContext(svc, plan_id);
      if (!ctx) return Response.json({ error: 'Tryout not found' }, { status: 404 });
      const event = ctx.events.find((e: any) => e.id === event_id);
      if (!event) return Response.json({ error: 'Pick the session this player joins' }, { status: 400 });

      const guardian = await upsertGuardian(svc, club_id, form, me);

      // Reuse the family's existing child, otherwise create them.
      let player: any = child.id ? await svc.Player.get(child.id).catch(() => null) : null;
      if (!player) {
        if (!child.first_name || !child.last_name) {
          return Response.json({ error: 'The player needs a first and last name' }, { status: 400 });
        }
        const kids = await svc.Player.filter({ guardian_id: guardian.id }, null, 200).catch(() => []);
        const sameName = (p: any) => `${p.first_name} ${p.last_name}`.trim().toLowerCase() === `${child.first_name} ${child.last_name}`.trim().toLowerCase();
        player = kids.find((p: any) => sameName(p) && (!child.date_of_birth || p.date_of_birth === child.date_of_birth)) || null;
        if (!player) {
          if (!child.date_of_birth) {
            return Response.json({ error: 'A new player needs a date of birth so eligibility can be checked' }, { status: 400 });
          }
          player = await svc.Player.create({
            club_id, first_name: child.first_name, last_name: child.last_name,
            date_of_birth: child.date_of_birth, gender: child.gender || undefined,
            guardian_id: guardian.id, guardian_ids: [guardian.id],
            guardian_name: `${form.first_name} ${form.last_name}`.trim(),
            status: 'pending', season: ctx.plan.season || undefined,
          });
        }
      }

      const check = eligibilityFor(player, ctx.plan, ctx.ageGroups);
      if (!check.eligible) {
        return Response.json({ error: `${player.first_name} ${player.last_name}: ${check.reason}` }, { status: 400 });
      }

      // A desk signup usually means paper waivers — accepted here or ticked as collected.
      const accepted: string[] = (waiver.accepted_documents || []).map((n: any) => String(n));
      const documents = (ctx.plan.required_documents || []).map((d: any) => ({
        name: d.name, required: d.required !== false, notes: d.notes || '',
        accepted: accepted.includes(d.name) || !!waiver.paper,
      }));
      const missingDocs = documents.filter((d: any) => d.required && !d.accepted);
      if (missingDocs.length) {
        return Response.json({ error: `Accept "${missingDocs[0].name}", or tick that the paperwork was collected on paper` }, { status: 400 });
      }

      const sessionRegs = ctx.regs.filter((r: any) => r.tryout_event_id === event.id);
      const occupied = countOccupying(sessionRegs);
      if (ctx.plan.max_capacity && occupied >= Number(ctx.plan.max_capacity)) {
        return Response.json({ error: `${ctx.plan.title} is at capacity — add the player to the pool and place them later` }, { status: 400 });
      }
      const spots = sessionSpots(event, sessionRegs);
      const waitlist = spots.capacity > 0 && occupied >= spots.capacity;

      const fee = tryoutFee(ctx.plan);
      const collectNow = payment === 'now' && !waitlist && fee >= 0.5;
      const sendLink = payment === 'link' && !waitlist && fee >= 0.5;
      const waived = payment === 'waive';

      const pooled = ctx.plan.season && player.id
        ? (await svc.TryoutRegistration.filter({ club_id, player_id: player.id, season_name: ctx.plan.season, status: 'pooled' }, null, 5).catch(() => []))[0] || null
        : null;

      const payload: any = {
        club_id, tryout_plan_id: ctx.plan.id, tryout_event_id: event.id,
        season_id: pooled?.season_id || '', season_name: ctx.plan.season || '',
        player_id: player.id, player_name: `${player.first_name} ${player.last_name}`.trim(),
        player_date_of_birth: player.date_of_birth || '', player_gender: player.gender || '',
        guardian_id: guardian.id, guardian_name: `${form.first_name} ${form.last_name}`.trim(),
        guardian_email: email, guardian_phone: form.phone || '',
        user_id: me?.id || '',
        desired_age_group: check.age_group || player.age_group || '',
        session_date: event.date, session_start_time: event.start_time || '',
        session_field_name: event.field_name || event.location || '',
        branch_id: event.branch_id || '', branch_name: event.branch_name || '',
        registered_date: today,
        status: waitlist ? 'waitlist' : sendLink ? 'pending_payment' : 'registered',
        pool_status: 'registered',
        payment_status: waived ? 'waived' : collectNow ? 'paid' : sendLink ? 'pending' : 'unpaid',
        waiver_status: 'signed',
        waiver_signature: String(waiver.signature || `${form.first_name} ${form.last_name}`).trim(),
        waiver_signed_by: `${me?.email || 'club admin'} on behalf of ${email}`,
        waiver_signed_at: new Date().toISOString(),
        waiver_documents: documents,
        fee_amount: fee, discount_amount: 0,
        amount_due: waived ? 0 : fee,
        amount_paid: collectNow ? fee : 0,
        currency: 'USD',
        refund_status: 'none',
        check_in_code: pooled?.check_in_code || code(),
        source: 'inside',
        notes: [body.note, `Added by ${me?.email || 'club admin'}`, waiver.paper ? 'Paperwork collected on paper.' : '', waitlist ? 'Session was full — on the waitlist.' : ''].filter(Boolean).join(' '),
      };
      const reg = pooled ? await svc.TryoutRegistration.update(pooled.id, payload) : await svc.TryoutRegistration.create(payload);
      await refreshEventCount(svc, event.id);

      // Money: record what was handed over at the desk, or mint a link to send.
      let link: string | null = null;
      if (collectNow) {
        const ledger = await svc.Payment.create({
          club_id, source_type: 'tryout_registration', source_id: reg.id,
          source_label: `Tryout fee — ${reg.player_name}`,
          player_id: reg.player_id, player_name: reg.player_name,
          guardian_name: reg.guardian_name, family_email: email,
          amount: money(fee), currency: 'USD', processor_name: 'Manual',
          payment_method: method || 'cash', status: 'paid_in_full',
          transaction_reference: reference || `desk-${Date.now()}`,
          payment_date: today, recorded_by: me?.email || 'admin', charge_type: 'other',
          notes: 'Tryout fee collected at registration',
        }).catch((e: any) => { console.error('admin_add_player: ledger failed', e); return null; });
        if (ledger) await svc.TryoutRegistration.update(reg.id, { payment_id: ledger.id });
      } else if (sendLink) {
        const secretKey = await getStripeSecretKey(base44, club_id).catch(() => null);
        if (secretKey && appUrl) {
          const params = new URLSearchParams();
          params.append('mode', 'payment');
          params.append('success_url', `${appUrl}/TryoutStatus?club=${club_id}&email=${encodeURIComponent(email)}`);
          params.append('cancel_url', `${appUrl}/TryoutStatus?club=${club_id}&email=${encodeURIComponent(email)}`);
          params.append('metadata[source_type]', 'tryout_registration');
          params.append('metadata[source_id]', reg.id);
          params.append('metadata[registration_ids]', reg.id);
          params.append('metadata[amounts]', String(money(fee)));
          params.append('metadata[group_id]', `try-${Date.now()}-desk`);
          params.append('metadata[club_id]', club_id);
          params.append('customer_email', email);
          params.append('line_items[0][quantity]', '1');
          params.append('line_items[0][price_data][currency]', 'usd');
          params.append('line_items[0][price_data][unit_amount]', String(Math.round(fee * 100)));
          params.append('line_items[0][price_data][product_data][name]', `${reg.player_name} — ${ctx.plan.title} tryout fee`);
          const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
          });
          const session = await res.json().catch(() => ({}));
          if (res.ok) {
            link = session.url;
            await svc.TryoutRegistration.update(reg.id, {
              stripe_checkout_session_id: session.id, stripe_checkout_url: session.url,
            }).catch(() => {});
          } else {
            console.error('admin_add_player: stripe error', session);
          }
        }
        if (!link) {
          // No online payment for this club — hand the fee to the ledger instead.
          await svc.TryoutRegistration.update(reg.id, { payment_status: 'unpaid', status: 'registered' }).catch(() => {});
        }
      }

      const final = await svc.TryoutRegistration.get(reg.id).catch(() => reg);
      return Response.json({
        ok: true, registration: final, payment_link: link, waitlisted: waitlist,
        warning: sendLink && !link ? 'Online payment is not set up for this club, so the fee is marked as due at the desk.' : undefined,
      });
    }

    // ================= Admin: pool + roster management =================
    if (['admin_move_bulk', 'admin_bib_assign', 'admin_remind', 'admin_note'].includes(String(action))) {
      if (!isClubAdmin(me)) return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
      const sameClub = (rowClub: string) => !clubOf(me) || clubOf(me) === rowClub || me.role === 'admin' || me.is_super_admin === true;

      // Move a batch of players into one session — including out of the season pool.
      if (action === 'admin_move_bulk') {
        const ids: string[] = Array.isArray(body.registration_ids) ? body.registration_ids : [];
        if (!ids.length) return Response.json({ error: 'Select at least one player' }, { status: 400 });
        const target = await svc.TryoutEvent.get(body.event_id).catch(() => null);
        if (!target) return Response.json({ error: 'Pick the session to move them to' }, { status: 404 });
        if (!sameClub(target.club_id)) return Response.json({ error: 'Forbidden' }, { status: 403 });

        const plan = target.tryout_plan_id ? await svc.TryoutPlan.get(target.tryout_plan_id).catch(() => null) : null;
        const targetRegs = await svc.TryoutRegistration.filter({ tryout_event_id: target.id }, null, 2000).catch(() => []);
        const spots = sessionSpots(target, targetRegs);
        let occupied = countOccupying(targetRegs);
        const moved: string[] = [];
        const waitlisted: string[] = [];
        const skipped: string[] = [];
        const touched = new Set<string>([target.id]);

        for (const id of ids) {
          const reg = await svc.TryoutRegistration.get(id).catch(() => null);
          if (!reg || !sameClub(reg.club_id)) { skipped.push(reg?.player_name || id); continue; }
          if (reg.tryout_event_id === target.id) continue;
          if (reg.status === 'cancelled') { skipped.push(`${reg.player_name} (cancelled)`); continue; }

          const planFull = plan?.max_capacity ? occupied >= Number(plan.max_capacity) : false;
          const sessionFull = spots.capacity > 0 && occupied >= spots.capacity;
          const status = planFull || sessionFull ? 'waitlist'
            : ['pooled', 'waitlist'].includes(reg.status) ? 'registered' : reg.status;

          const patch: any = {
            tryout_event_id: target.id,
            session_date: target.date,
            session_start_time: target.start_time || '',
            session_field_name: target.field_name || target.location || '',
            branch_id: target.branch_id || '',
            branch_name: target.branch_name || '',
            status,
            reschedule_history: [...(reg.reschedule_history || []), {
              at: new Date().toISOString(), by: me?.email || 'admin',
              from_event_id: reg.tryout_event_id || '', from_date: reg.session_date || '',
              to_event_id: target.id, to_date: target.date,
            }],
          };
          // A player coming out of the season pool joins this tryout for real.
          if (reg.status === 'pooled') {
            patch.pool_status = 'registered';
            patch.tryout_plan_id = plan?.id || reg.tryout_plan_id || '';
            const fee = tryoutFee(plan);
            if (fee >= 0.5 && !['paid', 'waived', 'refunded'].includes(reg.payment_status)) {
              patch.fee_amount = fee;
              patch.amount_due = fee;
              patch.payment_status = 'unpaid';
            }
          }

          await svc.TryoutRegistration.update(reg.id, patch);
          if (reg.tryout_event_id) touched.add(reg.tryout_event_id);
          if (status === 'waitlist') waitlisted.push(reg.player_name);
          else { moved.push(reg.player_name); occupied += 1; }
        }

        for (const eventId of touched) {
          await refreshEventCount(svc, eventId);
          if (eventId !== target.id) await promoteFromWaitlist(svc, eventId).catch(() => null);
        }
        return Response.json({ ok: true, moved: moved.length, waitlisted: waitlisted.length, skipped });
      }

      // Bib numbers, assigned in name order so a printed sheet is easy to read.
      if (action === 'admin_bib_assign') {
        const { registration_ids, plan_id, event_id, club_id: scopeClub, start, renumber } = body;
        let rows: any[] = [];
        if (Array.isArray(registration_ids) && registration_ids.length) {
          rows = await svc.TryoutRegistration.filter({ id: { $in: registration_ids } }, null, 500).catch(() => []);
        } else if (event_id) {
          rows = await svc.TryoutRegistration.filter({ tryout_event_id: event_id }, null, 2000).catch(() => []);
        } else if (plan_id) {
          rows = await svc.TryoutRegistration.filter({ tryout_plan_id: plan_id }, null, 2000).catch(() => []);
        } else if (scopeClub) {
          rows = await svc.TryoutRegistration.filter({ club_id: scopeClub }, null, 2000).catch(() => []);
        }
        if (!rows.length) return Response.json({ error: 'No players to number' }, { status: 400 });
        if (!rows.every((r: any) => sameClub(r.club_id))) return Response.json({ error: 'Forbidden' }, { status: 403 });

        const TAKING_PART = ['registered', 'pending_payment', 'checked_in', 'waitlist'];
        const active = rows
          .filter((r: any) => TAKING_PART.includes(r.status))
          .sort((a: any, b: any) => String(a.player_name || '').localeCompare(String(b.player_name || '')));
        if (!active.length) return Response.json({ error: 'Nobody in this selection is taking part yet' }, { status: 400 });

        const highest = active.reduce((m: number, r: any) => Math.max(m, Number(r.bib_number) || 0), 0);
        let next = Number(start) > 0 ? Number(start) : (renumber ? 1 : highest + 1);
        const updates: any[] = [];
        for (const r of active) {
          if (!renumber && Number(r.bib_number) >= 1) continue;
          updates.push({ id: r.id, bib_number: next });
          next += 1;
        }
        for (let i = 0; i < updates.length; i += 400) {
          await svc.TryoutRegistration.bulkUpdate(updates.slice(i, i + 400));
        }
        return Response.json({ ok: true, assigned: updates.length, next_bib: next, players: active.length });
      }

      // Reminders for the paperwork and fees a family still owes.
      if (action === 'admin_remind') {
        const ids: string[] = Array.isArray(body.registration_ids) ? body.registration_ids : [];
        if (!ids.length) return Response.json({ error: 'Select at least one family' }, { status: 400 });
        const kind = body.kind || 'all';
        const customMessage = String(body.message || '').trim();
        const regs = await svc.TryoutRegistration.filter({ id: { $in: ids } }, null, 500).catch(() => []);
        if (!regs.length) return Response.json({ error: 'Nothing to send' }, { status: 400 });
        if (!regs.every((r: any) => sameClub(r.club_id))) return Response.json({ error: 'Forbidden' }, { status: 403 });

        const club = await svc.Club.get(regs[0].club_id).catch(() => null);
        let sent = 0;
        let failed = 0;
        for (const reg of regs) {
          const email = String(reg.guardian_email || '').trim();
          const needsWaiver = reg.waiver_status !== 'signed';
          const needsPayment = ['unpaid', 'pending', 'failed', 'partially_paid'].includes(reg.payment_status);
          const lines: string[] = [];
          if (kind !== 'payment' && needsWaiver) lines.push(`- the signed paperwork (waivers) for ${reg.player_name}`);
          if (kind !== 'waiver' && needsPayment) {
            lines.push(`- the ${money(Number(reg.amount_due || 0) - Number(reg.amount_paid || 0))} tryout fee for ${reg.player_name}`);
          }
          if (!email || (!lines.length && !customMessage)) { failed += 1; continue; }

          const plan = reg.tryout_plan_id ? await svc.TryoutPlan.get(reg.tryout_plan_id).catch(() => null) : null;
          const when = reg.session_date ? `${reg.session_date}${reg.session_start_time ? ` at ${reg.session_start_time}` : ''}` : 'the tryout';
          const where = reg.session_field_name ? ` at ${reg.session_field_name}` : '';
          const subject = kind === 'payment' ? `Tryout fee for ${reg.player_name}`
            : kind === 'waiver' ? `Paperwork for ${reg.player_name}'s tryout`
              : `${reg.player_name}: a couple of things before the tryout`;
          const bodyText = [
            `Hi ${reg.guardian_name || 'there'},`,
            '',
            customMessage || `Before ${reg.player_name}'s ${plan?.title || 'tryout'} on ${when}${where}, we still need:`,
            ...(customMessage ? [] : lines),
            '',
            `You can review everything and pay here: ${appUrl}/TryoutStatus?club=${reg.club_id}&email=${encodeURIComponent(email)}`,
            '',
            'Thank you,',
            plan?.lead_name ? `${plan.lead_name} · ${club?.name || 'the club'}` : (club?.name || 'the club'),
          ].join('\n');

          await sendBrandedEmail(base44, { to: email, subject, body: bodyText })
            .then(() => { sent += 1; })
            .catch((e: any) => { console.error('tryout reminder failed:', e?.message || e); failed += 1; });
          await svc.Notification.create({
            club_id: reg.club_id, user_email: email, type: 'announcement', delivery: 'push',
            title: subject,
            message: lines.length ? `Still needed: ${lines.map((l) => l.replace(/^- /, '')).join(', ')}` : customMessage,
          }).catch(() => {});
        }
        return Response.json({ ok: true, sent, failed });
      }

      // A staff note against one player.
      if (action === 'admin_note') {
        const text = String(body.text || '').trim();
        if (!text) return Response.json({ error: 'Write the note first' }, { status: 400 });
        const reg = await svc.TryoutRegistration.get(body.registration_id).catch(() => null);
        if (!reg) return Response.json({ error: 'Registration not found' }, { status: 404 });
        if (!sameClub(reg.club_id)) return Response.json({ error: 'Forbidden' }, { status: 403 });
        const notes = [...(reg.admin_notes || []), { at: new Date().toISOString(), by: me?.email || 'admin', text }];
        const updated = await svc.TryoutRegistration.update(reg.id, { admin_notes: notes });
        return Response.json({ ok: true, registration: updated });
      }
    }

    // ================= Admin actions =================
    const adminAction = String(action || '').startsWith('admin_');
    if (adminAction) {
      if (!isClubAdmin(me)) return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
      const { registration_id, note, method, reference, decision, amount } = body;
      const reg = await svc.TryoutRegistration.get(registration_id).catch(() => null);
      if (!reg) return Response.json({ error: 'Registration not found' }, { status: 404 });
      if (clubOf(me) && clubOf(me) !== reg.club_id && me.role !== 'admin' && me.is_super_admin !== true) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (action === 'admin_mark_paid') {
        const outstanding = money(Number(reg.amount_due || 0) - Number(reg.amount_paid || 0));
        const payment = outstanding > 0 ? await svc.Payment.create({
          club_id: reg.club_id, source_type: 'tryout_registration', source_id: reg.id,
          source_label: `Tryout fee — ${reg.player_name}`,
          player_id: reg.player_id, player_name: reg.player_name,
          guardian_name: reg.guardian_name, family_email: reg.guardian_email,
          amount: outstanding, currency: reg.currency || 'USD',
          processor_name: 'Manual', payment_method: method || 'cash',
          status: 'paid_in_full', transaction_reference: reference || `manual-${Date.now()}`,
          payment_date: today, recorded_by: me?.email || 'admin', charge_type: 'other',
          notes: note || 'Tryout fee recorded by an admin',
        }) : null;
        const updated = await svc.TryoutRegistration.update(reg.id, {
          payment_status: 'paid',
          amount_paid: money(Number(reg.amount_paid || 0) + Math.max(0, outstanding)),
          payment_id: payment?.id || reg.payment_id || '',
          status: reg.status === 'pending_payment' || reg.status === 'pooled' ? 'registered' : reg.status,
          financial_aid_status: reg.financial_aid_requested ? 'approved' : reg.financial_aid_status,
          notes: note ? `${reg.notes ? `${reg.notes}\n` : ''}${note}` : reg.notes,
        });
        await refreshEventCount(svc, reg.tryout_event_id);
        return Response.json({ ok: true, registration: updated, payment });
      }

      if (action === 'admin_waive') {
        const updated = await svc.TryoutRegistration.update(reg.id, {
          payment_status: 'waived',
          status: reg.status === 'pending_payment' || reg.status === 'pooled' ? 'registered' : reg.status,
          notes: note ? `${reg.notes ? `${reg.notes}\n` : ''}Waived: ${note}` : reg.notes,
        });
        await refreshEventCount(svc, reg.tryout_event_id);
        return Response.json({ ok: true, registration: updated });
      }

      if (action === 'admin_financial_aid') {
        const approved = decision === 'approved';
        const updated = await svc.TryoutRegistration.update(reg.id, {
          financial_aid_status: approved ? 'approved' : 'declined',
          financial_aid_note: note || reg.financial_aid_note,
          payment_status: approved ? 'waived' : 'unpaid',
          status: approved && reg.status === 'pending_payment' ? 'registered' : reg.status,
        });
        await svc.Notification.create({
          club_id: reg.club_id, user_email: reg.guardian_email, type: 'announcement',
          title: approved ? 'Financial aid approved for your tryout fee' : 'Financial aid decision for your tryout fee',
          message: approved
            ? `${reg.player_name}'s tryout fee has been covered by the club. See you at the tryout.`
            : `A decision was made on the financial aid request for ${reg.player_name}. The club will follow up with next steps.`,
        }).catch(() => {});
        return Response.json({ ok: true, registration: updated });
      }

      if (action === 'admin_refund_recorded') {
        const refundAmount = money(Math.min(Number(amount || reg.refund_amount || reg.amount_paid || 0), Number(reg.amount_paid || 0)));
        const updated = await svc.TryoutRegistration.update(reg.id, {
          refund_status: 'issued',
          refund_amount: refundAmount,
          refunded_at: new Date().toISOString(),
          payment_status: 'refunded',
          amount_paid: money(Math.max(0, Number(reg.amount_paid || 0) - refundAmount)),
          notes: note ? `${reg.notes ? `${reg.notes}\n` : ''}${note}` : reg.notes,
        });
        return Response.json({ ok: true, registration: updated });
      }

      return Response.json({ error: `Unknown admin action: ${action}` }, { status: 400 });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('tryout-registration error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}