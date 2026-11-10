// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import {
  isClubAdmin, clubOf, paged, TERMINAL, ON_LIST,
  combinedScores, spotsFor, playerHoldsOffer,
  sendOffer, promoteNextWaitlisted, expireStaleOffers,
  acceptOffer, declineOffer, lockRoster, autoFinalizeIfFull, familyOffers,
} from '../../shared/tryoutOffers.ts';
import { sendTryoutNoticeEmail, sendTryoutOfferEmail } from '../../shared/tryoutEmails.ts';

/**
 * The tryout offers + roster service.
 *
 *  board         — a tryout's whole offer board: teams, spots remaining, the
 *                  proposed roster and waitlist order, and the evaluated pool
 *                  ranked by combined score (with who sits on more than one
 *                  team's list).
 *  propose       — a coach (or admin) saves a team's roster and waitlist order.
 *  approve/send  — the admin approval step, then the offers go out.
 *  extend/override — admins move deadlines and force an outcome.
 *  respond       — the family accepts or declines from their status page.
 *  finalize      — locks the rosters onto the teams.
 *  bulk_message  — non-selection notices and thank-you notes to families.
 *  family        — the offers one family can see.
 *
 * A player can only ever hold one live offer: sending is refused when another
 * team already has one out, and accepting stands the other lists down.
 */

const notFound = (e: any) => (e.status === 404 ? null : Promise.reject(e));
const lower = (v: any) => String(v || '').trim().toLowerCase();

function ageOn(dob: any, onDate: any) {
  if (!dob) return null;
  const d = new Date(`${String(dob).slice(0, 10)}T00:00:00Z`);
  const on = onDate ? new Date(`${String(onDate).slice(0, 10)}T00:00:00Z`) : new Date();
  if (Number.isNaN(d.getTime()) || Number.isNaN(on.getTime())) return null;
  let age = on.getUTCFullYear() - d.getUTCFullYear();
  const month = on.getUTCMonth() - d.getUTCMonth();
  if (month < 0 || (month === 0 && on.getUTCDate() < d.getUTCDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

const listOrder = (a: any, b: any) =>
  (Number(a.rank) || 999) - (Number(b.rank) || 999) || String(a.player_name).localeCompare(String(b.player_name));

const offerRow = (o: any) => ({
  id: o.id,
  player_id: o.player_id || '',
  registration_id: o.registration_id || '',
  player_name: o.player_name,
  player_photo_url: o.player_photo_url || '',
  age: o.player_age ?? null,
  bib: o.player_bib ?? null,
  gender: o.player_gender || '',
  age_group: o.age_group || '',
  guardian_email: o.guardian_email || '',
  guardian_name: o.guardian_name || '',
  combined_score: Number(o.combined_score || 0),
  list_type: o.list_type || 'roster',
  rank: Number(o.rank || 0),
  status: o.status,
  fee_amount: Number(o.fee_amount || 0),
  fee_note: o.fee_note || '',
  sent_at: o.sent_at || '',
  expires_at: o.expires_at || '',
  responded_at: o.responded_at || '',
  response_note: o.response_note || '',
  response_channel: o.response_channel || '',
  proposed_by_name: o.proposed_by_name || '',
  proposed_at: o.proposed_at || '',
  approved_by_name: o.approved_by_name || '',
  approved_at: o.approved_at || '',
  extended_count: Number(o.extended_count || 0),
  final_registration_id: o.final_registration_id || '',
  history: o.history || [],
});

/** A tryout's sessions, everyone who took part, and their combined scores. */
async function loadPlan(db: any, planId: string) {
  const plan = await db.TryoutPlan.get(planId).catch(notFound);
  if (!plan) return null;
  const events = await paged((q: any, o: any) => db.TryoutEvent.filter(q, o), { tryout_plan_id: plan.id }, 'date', 500);
  const eventIds = events.map((e: any) => e.id);
  const [regs, evals, teams] = await Promise.all([
    eventIds.length
      ? paged((q: any, o: any) => db.TryoutRegistration.filter(q, o), { tryout_event_id: { $in: eventIds } }, 'player_name', 3000)
      : [],
    eventIds.length
      ? paged((q: any, o: any) => db.TryoutEvaluation.filter(q, o), { tryout_event_id: { $in: eventIds } }, null, 5000)
      : [],
    (plan.team_ids || []).length ? db.Team.filter({ id: { $in: plan.team_ids } }, null, 200).catch(() => []) : [],
  ]);

  const scores = combinedScores(evals);
  const evalCount: Record<string, number> = {};
  const photo: Record<string, string> = {};
  const playerIdFromEval: Record<string, string> = {};
  for (const e of evals) {
    const key = e.player_id || e.player_name;
    if (!key) continue;
    evalCount[key] = (evalCount[key] || 0) + 1;
    if (e.player_photo_url) photo[key] = e.player_photo_url;
    if (e.player_id) playerIdFromEval[key] = e.player_id;
  }

  const byKey = new Map<string, any>();
  for (const r of regs) {
    if (r.status === 'cancelled' || r.status === 'pooled') continue;
    const key = r.player_id || r.player_name;
    const row = {
      registration_id: r.id,
      player_id: r.player_id || playerIdFromEval[key] || '',
      player_name: r.player_name,
      guardian_id: r.guardian_id || '',
      guardian_name: r.guardian_name || '',
      guardian_email: lower(r.guardian_email),
      player_photo_url: photo[key] || '',
      player_bib: r.bib_number ?? null,
      player_age: ageOn(r.player_date_of_birth, r.session_date),
      age_group: r.desired_age_group || plan.age_group || '',
      player_gender: r.player_gender || plan.gender || '',
      combined_score: scores[key] || 0,
      evaluations: evalCount[key] || 0,
      checked_in: !!r.checked_in,
    };
    const prev = byKey.get(key);
    if (!prev || row.evaluations > prev.evaluations || (!prev.player_id && row.player_id)) byKey.set(key, row);
  }

  return { plan, events, regs, teams, pool: [...byKey.values()] };
}

/** The Coach records (ids) that belong to the signed-in coach. */
async function coachIdsFor(db: any, clubId: string, email: string) {
  if (!email) return [];
  const coaches = await db.Coach.filter({ club_id: clubId }, null, 500).catch(() => []);
  return coaches.filter((c: any) => lower(c.email) === email).map((c: any) => c.id);
}

const coachesTeam = (team: any, coachIds: string[]) =>
  (team?.coach_id && coachIds.includes(team.coach_id)) ||
  (team?.coach_ids || []).some((id: string) => coachIds.includes(id));

/** May this person list players for this team? */
function mayPropose(plan: any, team: any, me: any, admin: boolean, coachIds: string[]) {
  if (admin) return true;
  if (plan.lead_user_id && plan.lead_user_id === me.id) return true;
  return coachesTeam(team, coachIds);
}

/** Send a batch of offers, refusing any player who already holds one. */
async function sendRows(db: any, base44: any, plan: any, teams: any[], rows: any[], appUrl: string) {
  const sent: any[] = [];
  const skipped: any[] = [];
  const tally = new Map<string, any>();

  for (const offer of rows) {
    const team = teams.find((t: any) => t.id === offer.team_id);
    if (!team) { skipped.push({ player_name: offer.player_name, reason: 'That team is no longer in this tryout' }); continue; }
    if (!tally.has(team.id)) {
      const teamOffers = await db.TryoutOffer.filter({ tryout_plan_id: plan.id, team_id: team.id }, null, 500).catch(() => []);
      tally.set(team.id, spotsFor(team, teamOffers));
    }
    const spots = tally.get(team.id);
    if (spots.taken + spots.open >= spots.total) {
      skipped.push({ player_name: offer.player_name, reason: `${team.name} has no spots left` });
      continue;
    }
    const held = await playerHoldsOffer(db, offer, plan.club_id);
    if (held) {
      skipped.push({ player_name: offer.player_name, reason: `already has ${held.status === 'accepted' ? 'accepted a spot' : 'an offer'} at ${held.team_name}` });
      continue;
    }
    spots.open += 1;
    sent.push(await sendOffer(db, base44, { offer, plan, team, appUrl }));
  }
  return { sent, skipped };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const appUrl = (req.headers.get('X-Base44-App-Url') || process.env.WIX_CHECKOUT_APP_URL || '').replace(/\/$/, '');
    const publicAction = action === 'respond' || action === 'family';
    const me: any = publicAction
      ? await base44.auth.me().catch(() => null)
      : await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!publicAction && !me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // ================= The family's own offers =================
    if (action === 'family') {
      const clubId = String(body.club_id || '');
      const email = lower(body.email);
      if (!clubId || !email) return Response.json({ error: 'club_id and email are required' }, { status: 400 });
      return Response.json({ ok: true, offers: await familyOffers(db, clubId, email) });
    }

    // ================= Accept or decline =================
    if (action === 'respond') {
      const offer = await db.TryoutOffer.get(body.offer_id).catch(notFound);
      if (!offer) return Response.json({ error: 'Offer not found' }, { status: 404 });
      const email = lower(body.email);
      if (!email || email !== lower(offer.guardian_email)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const plan = offer.tryout_plan_id ? await db.TryoutPlan.get(offer.tryout_plan_id).catch(notFound) : null;
      const team = offer.team_id ? await db.Team.get(offer.team_id).catch(notFound) : null;

      // A deadline that passed while nobody was looking hands the spot on.
      if (offer.expires_at && new Date(offer.expires_at).getTime() < Date.now()) {
        await expireStaleOffers(db, base44, { plan_id: offer.tryout_plan_id, appUrl }).catch(() => null);
        return Response.json({ error: 'This offer has expired — the spot passed to the next player on the list.' }, { status: 400 });
      }
      if (offer.status !== 'sent') {
        return Response.json({ error: `This offer is already ${offer.status}.` }, { status: 400 });
      }
      if (plan?.roster_locked) {
        return Response.json({ error: 'This roster is already finalized. Please contact the club.' }, { status: 400 });
      }

      if (body.decision === 'accept') {
        const result = await acceptOffer(db, { offer, plan, team, channel: 'family', byEmail: email });
        const refreshed = await db.TryoutPlan.get(plan.id).catch(() => plan);
        const finalized = await autoFinalizeIfFull(db, refreshed).catch(() => null);
        return Response.json({ ok: true, offer: offerRow(result.offer), invite_id: result.invite_id, roster_finalized: !!finalized });
      }
      if (body.decision === 'decline') {
        await declineOffer(db, { offer, channel: 'family', byEmail: email, note: body.note });
        const promoted = plan && team && !plan.roster_locked
          ? await promoteNextWaitlisted(db, base44, { plan, team, appUrl, byEmail: 'system' }).catch(() => null)
          : null;
        return Response.json({ ok: true, promoted: promoted?.player_name || null });
      }
      return Response.json({ error: 'Choose accept or decline' }, { status: 400 });
    }

    // ================= The offer board =================
    if (action === 'board') {
      const ctx = await loadPlan(db, body.plan_id);
      if (!ctx) return Response.json({ error: 'Tryout not found' }, { status: 404 });
      const { plan, teams, pool } = ctx;
      const admin = isClubAdmin(me);
      const myClub = clubOf(me);
      if (!admin && myClub && plan.club_id && myClub !== plan.club_id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Deadlines that have passed lapse before the board is read.
      await expireStaleOffers(db, base44, { plan_id: plan.id, appUrl }).catch(() => null);

      const offers = await paged((q: any, o: any) => db.TryoutOffer.filter(q, o), { tryout_plan_id: plan.id }, 'rank', 2000);
      const coachIds = admin ? [] : await coachIdsFor(db, plan.club_id, lower(me.email));
      const mode = plan.offer_approval_mode || 'admin_approval';

      const teamRows = teams.map((team: any) => {
        const teamOffers = offers.filter((o: any) => o.team_id === team.id);
        const mine = mayPropose(plan, team, me, admin, coachIds);
        const spots = spotsFor(team, teamOffers);
        return {
          id: team.id,
          name: team.name,
          age_group: team.age_group || '',
          gender: team.gender || '',
          coach_names: team.coach_names || [],
          cost: Number(team.cost || 0),
          spots,
          can_propose: mine,
          can_send: admin || (mine && mode === 'coach_direct'),
          is_mine: mine,
          rows: teamOffers.map(offerRow).sort(listOrder),
          counts: {
            sent: teamOffers.filter((o: any) => o.status === 'sent').length,
            accepted: teamOffers.filter((o: any) => o.status === 'accepted').length,
            declined: teamOffers.filter((o: any) => o.status === 'declined').length,
            expired: teamOffers.filter((o: any) => o.status === 'expired').length,
            proposed: teamOffers.filter((o: any) => o.status === 'proposed').length,
            pending: teamOffers.filter((o: any) => o.status === 'pending' && o.list_type !== 'waitlist').length,
            waitlist: teamOffers.filter((o: any) => o.list_type === 'waitlist' && !TERMINAL.includes(o.status)).length,
          },
        };
      });

      // Who sits on more than one team's list right now.
      const listsByPlayer = new Map<string, any[]>();
      for (const o of offers) {
        if (!ON_LIST.includes(o.status)) continue;
        const key = o.player_id || o.player_name;
        if (!listsByPlayer.has(key)) listsByPlayer.set(key, []);
        listsByPlayer.get(key)!.push(o);
      }

      const poolRows = pool
        .map((p: any) => {
          const lists = (listsByPlayer.get(p.player_id || p.player_name) || [])
            .map((o: any) => ({ team_id: o.team_id, team_name: o.team_name, list_type: o.list_type, status: o.status }));
          return { ...p, on_lists: lists, on_team_count: new Set(lists.map((l: any) => l.team_id)).size };
        })
        .sort((a: any, b: any) => (b.combined_score - a.combined_score) || String(a.player_name).localeCompare(String(b.player_name)));

      const count = (fn: (o: any) => boolean) => offers.filter(fn).length;
      return Response.json({
        ok: true,
        is_admin: admin,
        settings: {
          approval_mode: mode,
          expiry_hours: Number(plan.offer_expiry_hours) || 72,
          locked: !!plan.roster_locked,
          finalized_at: plan.roster_finalized_at || '',
          finalized_by: plan.roster_finalized_by || '',
        },
        plan: {
          id: plan.id, title: plan.title, season: plan.season || '',
          age_group: plan.age_group || '', gender: plan.gender || '', status: plan.status || '',
        },
        teams: teamRows,
        pool: poolRows,
        totals: {
          teams: teamRows.length,
          spots: teamRows.reduce((s: number, t: any) => s + t.spots.total, 0),
          filled: teamRows.reduce((s: number, t: any) => s + t.spots.taken, 0),
          remaining: teamRows.reduce((s: number, t: any) => s + t.spots.remaining, 0),
          offers_out: count((o: any) => o.status === 'sent'),
          proposed: count((o: any) => o.status === 'proposed'),
          pending: count((o: any) => o.status === 'pending' && o.list_type !== 'waitlist'),
          waitlist: count((o: any) => o.list_type === 'waitlist' && !TERMINAL.includes(o.status)),
          accepted: count((o: any) => o.status === 'accepted'),
          declined: count((o: any) => o.status === 'declined'),
          expired: count((o: any) => o.status === 'expired'),
          players: poolRows.length,
          evaluated: poolRows.filter((p: any) => p.evaluations > 0).length,
          duplicates: poolRows.filter((p: any) => p.on_team_count > 1).length,
        },
      });
    }

    // ================= Everything below is staff work =================
    const admin = isClubAdmin(me);
    const ctx = ['propose', 'approve', 'send', 'settings', 'finalize', 'bulk_message'].includes(String(action))
      ? await loadPlan(db, body.plan_id)
      : null;
    if (['propose', 'approve', 'send', 'settings', 'finalize', 'bulk_message'].includes(String(action)) && !ctx) {
      return Response.json({ error: 'Tryout not found' }, { status: 404 });
    }
    const plan: any = ctx?.plan;
    const teams: any[] = ctx?.teams || [];
    const myClub = clubOf(me);
    if (plan && !admin && myClub && plan.club_id && myClub !== plan.club_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const coachIds = admin || !plan ? [] : await coachIdsFor(db, plan.club_id, lower(me.email));

    // A coach lists players for their own team; admins for any.
    if (action === 'propose') {
      const team = teams.find((t: any) => t.id === body.team_id);
      if (!team) return Response.json({ error: 'That team is not part of this tryout' }, { status: 400 });
      if (!mayPropose(plan, team, me, admin, coachIds)) {
        return Response.json({ error: 'You are not assigned to this team' }, { status: 403 });
      }
      if (plan.roster_locked) {
        return Response.json({ error: 'The roster is finalized — an admin has to unlock it first' }, { status: 400 });
      }

      const rosterIds: string[] = [...new Set((body.roster || []).map(String))];
      const waitIds: string[] = [...new Set((body.waitlist || []).map(String))];
      if (rosterIds.some((id) => waitIds.includes(id))) {
        return Response.json({ error: 'A player cannot be on the roster and the waitlist at once' }, { status: 400 });
      }
      const poolById = new Map(ctx.pool.map((p: any) => [p.registration_id, p]));
      if ([...rosterIds, ...waitIds].some((id) => !poolById.has(id))) {
        return Response.json({ error: 'One of those players is not in this tryout' }, { status: 400 });
      }

      const existing = await db.TryoutOffer.filter({ tryout_plan_id: plan.id, team_id: team.id }, 'rank', 500).catch(() => []);
      const spots = spotsFor(team, existing);
      if (rosterIds.length > spots.remaining) {
        return Response.json({
          error: `${team.name} has ${spots.remaining} spot${spots.remaining === 1 ? '' : 's'} left — move ${rosterIds.length - spots.remaining} player(s) to the waitlist.`,
        }, { status: 400 });
      }

      const keepRegs = new Set([...rosterIds, ...waitIds]);
      const keepPlayers = new Set([...keepRegs].map((id) => poolById.get(id)?.player_id).filter(Boolean));
      const dropped = existing.filter((o: any) =>
        ['sent', 'accepted'].includes(o.status) &&
        !keepRegs.has(o.registration_id) && !(o.player_id && keepPlayers.has(o.player_id)));
      if (dropped.length) {
        return Response.json({
          error: `${dropped.map((o: any) => o.player_name).join(', ')} already ${dropped.length > 1 ? 'have' : 'has'} an offer out — an admin must withdraw ${dropped.length > 1 ? 'them' : 'that offer'} first.`,
        }, { status: 400 });
      }

      const mode = plan.offer_approval_mode || 'admin_approval';
      const now = new Date().toISOString();
      const fee = body.fee_amount != null ? Number(body.fee_amount) : undefined;
      const feeNote = typeof body.fee_note === 'string' ? body.fee_note : undefined;
      const saved: any[] = [];

      const write = async (registrationIds: string[], listType: 'roster' | 'waitlist') => {
        for (let i = 0; i < registrationIds.length; i += 1) {
          const p: any = poolById.get(registrationIds[i]);
          const rank = i + 1;
          const current = existing.find((o: any) =>
            o.registration_id === p.registration_id || (p.player_id && o.player_id === p.player_id));
          const base: any = {
            club_id: plan.club_id,
            tryout_plan_id: plan.id,
            team_id: team.id,
            team_name: team.name,
            registration_id: p.registration_id,
            player_id: p.player_id || '',
            player_name: p.player_name,
            player_photo_url: p.player_photo_url || '',
            player_age: p.player_age ?? null,
            player_bib: p.player_bib ?? null,
            player_gender: p.player_gender || '',
            age_group: p.age_group || '',
            guardian_id: p.guardian_id || '',
            guardian_name: p.guardian_name || '',
            guardian_email: p.guardian_email || '',
            combined_score: p.combined_score || 0,
            list_type: listType,
            rank,
            currency: 'USD',
            ...(fee !== undefined ? { fee_amount: fee } : {}),
            ...(feeNote !== undefined ? { fee_note: feeNote } : {}),
          };
          if (current) {
            // An offer that is already out keeps its status and deadline —
            // only its place on the list moves.
            const live = ['sent', 'accepted'].includes(current.status);
            saved.push(await db.TryoutOffer.update(current.id, {
              ...base,
              ...(live ? { status: current.status } : {
                status: mode === 'coach_direct' && listType === 'roster' ? 'pending' : 'proposed',
                proposed_by_email: me.email,
                proposed_by_name: me.full_name || me.email,
                proposed_at: now,
              }),
              history: [...(current.history || []), {
                at: now, by: me.email, action: 'listed',
                note: `${listType === 'roster' ? 'Roster' : 'Waitlist'} position ${rank}`,
              }],
            }));
          } else {
            saved.push(await db.TryoutOffer.create({
              ...base,
              status: mode === 'coach_direct' && listType === 'roster' ? 'pending' : 'proposed',
              proposed_by_email: me.email,
              proposed_by_name: me.full_name || me.email,
              proposed_at: now,
              history: [{ at: now, by: me.email, action: 'listed', note: `${listType === 'roster' ? 'Roster' : 'Waitlist'} position ${rank}` }],
            }));
          }
        }
      };

      await write(rosterIds, 'roster');
      await write(waitIds, 'waitlist');

      const kept = new Set(saved.map((o: any) => o.id));
      const removable = existing.filter((o: any) => !kept.has(o.id) && !['sent', 'accepted'].includes(o.status));
      if (removable.length) {
        await db.TryoutOffer.deleteMany({ id: { $in: removable.map((o: any) => o.id) } }).catch(() => null);
      }

      return Response.json({
        ok: true,
        saved: saved.length,
        removed: removable.length,
        team_id: team.id,
        spots: spotsFor(team, await db.TryoutOffer.filter({ tryout_plan_id: plan.id, team_id: team.id }, null, 500).catch(() => [])),
      });
    }

    // Approve the coaches' proposals, optionally sending them straight away.
    if (action === 'approve') {
      if (!admin) return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
      if (plan.roster_locked) return Response.json({ error: 'The roster is already finalized' }, { status: 400 });
      let proposals: any[] = [];
      if (Array.isArray(body.offer_ids) && body.offer_ids.length) {
        proposals = await db.TryoutOffer.filter({ id: { $in: body.offer_ids } }, null, 200).catch(() => []);
      } else {
        const query: any = { tryout_plan_id: plan.id, status: 'proposed' };
        if (body.team_id) query.team_id = body.team_id;
        proposals = await db.TryoutOffer.filter(query, 'rank', 500).catch(() => []);
      }
      proposals = proposals.filter((o: any) => o.tryout_plan_id === plan.id);
      if (!proposals.length) return Response.json({ error: 'Nothing is waiting for approval' }, { status: 400 });

      const now = new Date().toISOString();
      const approved: any[] = [];
      for (const offer of proposals) {
        approved.push(await db.TryoutOffer.update(offer.id, {
          status: 'pending',
          approved_by_email: me.email,
          approved_by_name: me.full_name || me.email,
          approved_at: now,
          history: [...(offer.history || []), { at: now, by: me.email, action: 'approved', note: 'Approved by an admin' }],
        }));
      }
      if (!body.send) {
        return Response.json({ ok: true, approved: approved.length });
      }
      const { sent, skipped } = await sendRows(db, base44, plan, teams, approved, appUrl);
      return Response.json({ ok: true, approved: approved.length, sent: sent.length, skipped });
    }

    // Put the offers in the families' hands.
    if (action === 'send') {
      const mode = plan.offer_approval_mode || 'admin_approval';
      let rows: any[] = [];
      if (Array.isArray(body.offer_ids) && body.offer_ids.length) {
        rows = await db.TryoutOffer.filter({ id: { $in: body.offer_ids } }, null, 200).catch(() => []);
      } else {
        rows = await db.TryoutOffer.filter(
          { tryout_plan_id: plan.id, team_id: body.team_id, status: 'pending', list_type: 'roster' }, 'rank', 200,
        ).catch(() => []);
      }
      rows = rows.filter((o: any) => o.tryout_plan_id === plan.id);
      if (!rows.length) return Response.json({ error: 'Nothing is ready to send' }, { status: 400 });
      if (plan.roster_locked) return Response.json({ error: 'The roster is already finalized' }, { status: 400 });

      for (const offer of rows) {
        const team = teams.find((t: any) => t.id === offer.team_id);
        const mine = !!team && mayPropose(plan, team, me, admin, coachIds);
        if (!admin && !(mine && mode === 'coach_direct')) {
          return Response.json({ error: 'Your club has an admin approve offers before they go out' }, { status: 403 });
        }
      }

      const { sent, skipped } = await sendRows(db, base44, plan, teams, rows, appUrl);
      return Response.json({ ok: true, sent: sent.length, skipped });
    }

    // Move a deadline, or force an outcome.
    if (action === 'extend' || action === 'override') {
      if (!admin) return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
      const offer = await db.TryoutOffer.get(body.offer_id).catch(notFound);
      if (!offer) return Response.json({ error: 'Offer not found' }, { status: 404 });
      const team = teams.find((t: any) => t.id === offer.team_id) || await db.Team.get(offer.team_id).catch(notFound);
      const now = new Date().toISOString();

      if (action === 'extend') {
        const hours = Number(body.hours) || 24;
        const from = offer.expires_at && new Date(offer.expires_at).getTime() > Date.now()
          ? new Date(offer.expires_at).getTime()
          : Date.now();
        const expiresAt = body.expires_at ? new Date(body.expires_at).toISOString() : new Date(from + hours * 3600000).toISOString();
        const revived = offer.status === 'expired';
        const updated = await db.TryoutOffer.update(offer.id, {
          expires_at: expiresAt,
          extended_count: Number(offer.extended_count || 0) + 1,
          ...(revived ? { status: 'sent', responded_at: '', response_note: '' } : {}),
          history: [...(offer.history || []), { at: now, by: me.email, action: 'extended', note: `Deadline moved to ${expiresAt}` }],
        });
        if (revived && offer.registration_id) {
          await db.TryoutRegistration.update(offer.registration_id, { pool_status: 'offered' }).catch(() => null);
        }
        if (body.resend && updated.guardian_email) {
          const link = `${appUrl}/TryoutStatus?club=${updated.club_id}&email=${encodeURIComponent(updated.guardian_email)}`;
          await sendTryoutOfferEmail(base44, { to: updated.guardian_email, offer: updated, team, plan, respondUrl: link })
            .catch((e: any) => console.error('offer resend failed:', e?.message || e));
          await db.Notification.create({
            club_id: updated.club_id, user_email: updated.guardian_email, type: 'announcement', delivery: 'push',
            title: `Offer extended: ${updated.player_name} → ${updated.team_name}`,
            message: `The club moved the deadline to ${expiresAt}.`, link,
          }).catch(() => null);
        }
        return Response.json({ ok: true, offer: offerRow(updated) });
      }

      const status = String(body.status || '');
      let updated: any = offer;
      let promoted: any = null;

      if (status === 'accepted') {
        const result = await acceptOffer(db, { offer, plan, team, channel: 'admin', byEmail: me.email });
        updated = result.offer;
        const refreshed = await db.TryoutPlan.get(plan.id).catch(() => plan);
        const finalized = await autoFinalizeIfFull(db, refreshed).catch(() => null);
        if (body.note) updated = await db.TryoutOffer.update(updated.id, { response_note: body.note });
        return Response.json({
          ok: true, offer: offerRow(updated), invite_id: result.invite_id,
          roster_finalized: !!finalized,
        });
      }

      if (status === 'declined') {
        updated = await declineOffer(db, { offer, channel: 'admin', byEmail: me.email, note: body.note || 'Marked declined by an admin' });
        promoted = team && !plan.roster_locked
          ? await promoteNextWaitlisted(db, base44, { plan, team, appUrl, byEmail: me.email }).catch(() => null)
          : null;
        return Response.json({ ok: true, offer: offerRow(updated), promoted: promoted?.player_name || null });
      }

      if (status === 'withdrawn') {
        updated = await db.TryoutOffer.update(offer.id, {
          status: 'withdrawn',
          response_note: body.note || 'Withdrawn by an admin',
          history: [...(offer.history || []), { at: now, by: me.email, action: 'withdrawn', note: body.note || 'Withdrawn by an admin' }],
        });
        if (offer.registration_id) {
          await db.TryoutRegistration.update(offer.registration_id, { pool_status: 'withdrawn' }).catch(() => null);
        }
        if (['sent', 'accepted'].includes(offer.status) && team && !plan.roster_locked) {
          promoted = await promoteNextWaitlisted(db, base44, { plan, team, appUrl, byEmail: me.email }).catch(() => null);
        }
        return Response.json({ ok: true, offer: offerRow(updated), promoted: promoted?.player_name || null });
      }

      if (status === 'sent') {
        const { sent, skipped } = await sendRows(db, base44, plan, teams, [offer], appUrl);
        return Response.json({ ok: true, sent: sent.length, skipped });
      }

      const patch: any = {};
      if (['pending', 'proposed'].includes(status)) {
        patch.status = status;
        patch.history = [...(offer.history || []), { at: now, by: me.email, action: 'relisted', note: `Put back on the ${offer.list_type || 'roster'} list` }];
      } else if (status) {
        return Response.json({ error: `Unknown status: ${status}` }, { status: 400 });
      }
      if (body.list_type && ['roster', 'waitlist'].includes(body.list_type)) patch.list_type = body.list_type;
      if (body.fee_amount != null) patch.fee_amount = Number(body.fee_amount);
      if (typeof body.fee_note === 'string') patch.fee_note = body.fee_note;
      if (body.note) patch.response_note = body.note;
      if (!Object.keys(patch).length) return Response.json({ error: 'Nothing to change' }, { status: 400 });

      updated = await db.TryoutOffer.update(offer.id, patch);
      return Response.json({ ok: true, offer: offerRow(updated) });
    }

    // Per-tryout offer settings.
    if (action === 'settings') {
      if (!admin) return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
      const patch: any = {};
      if (body.offer_approval_mode) {
        if (!['coach_direct', 'admin_approval'].includes(body.offer_approval_mode)) {
          return Response.json({ error: 'Unknown approval mode' }, { status: 400 });
        }
        patch.offer_approval_mode = body.offer_approval_mode;
      }
      if (body.offer_expiry_hours != null) {
        const hours = Math.round(Number(body.offer_expiry_hours));
        if (!(hours >= 1 && hours <= 720)) return Response.json({ error: 'Give the family between 1 and 720 hours to respond' }, { status: 400 });
        patch.offer_expiry_hours = hours;
      }
      if (!Object.keys(patch).length) return Response.json({ error: 'Nothing to save' }, { status: 400 });
      const updated = await db.TryoutPlan.update(plan.id, patch);

      // Switching to "coaches send" clears proposals that were waiting on approval.
      let released = 0;
      if (patch.offer_approval_mode === 'coach_direct') {
        const waiting = await db.TryoutOffer.filter({ tryout_plan_id: plan.id, status: 'proposed' }, null, 500).catch(() => []);
        for (const offer of waiting) {
          await db.TryoutOffer.update(offer.id, {
            status: 'pending',
            history: [...(offer.history || []), { at: new Date().toISOString(), by: me.email, action: 'approved', note: 'Coaches send offers directly for this tryout' }],
          }).catch(() => null);
        }
        released = waiting.length;
      }
      return Response.json({
        ok: true,
        settings: {
          approval_mode: updated.offer_approval_mode || 'admin_approval',
          expiry_hours: Number(updated.offer_expiry_hours) || 72,
          locked: !!updated.roster_locked,
          finalized_at: updated.roster_finalized_at || '',
          finalized_by: updated.roster_finalized_by || '',
        },
        released,
      });
    }

    // Finalize (or unlock) the rosters.
    if (action === 'finalize') {
      if (!admin) return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
      if (body.unlock) {
        const updated = await db.TryoutPlan.update(plan.id, {
          roster_locked: false,
          roster_finalized_by: `${me.email} (unlocked)`,
        });
        return Response.json({ ok: true, unlocked: true, finalized_by: updated.roster_finalized_by || '' });
      }
      const offers = await paged((q: any, o: any) => db.TryoutOffer.filter(q, o), { tryout_plan_id: plan.id }, 'rank', 2000);
      const accepted = offers.filter((o: any) => o.status === 'accepted').length;
      if (!accepted) {
        return Response.json({ error: 'Nobody has accepted an offer yet — there is no roster to finalize' }, { status: 400 });
      }
      const result = await lockRoster(db, plan, offers, me.email);
      return Response.json({
        ok: true, teams: result.teams, players: result.players, accepted,
        finalized_by: me.email,
      });
    }

    // Non-selection notices and thank-yous.
    if (action === 'bulk_message') {
      if (!admin) return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });
      const offers = await paged((q: any, o: any) => db.TryoutOffer.filter(q, o), { tryout_plan_id: plan.id }, null, 2000);
      const acceptedPlayers = new Set(offers.filter((o: any) => o.status === 'accepted').map((o: any) => o.player_id || o.player_name));
      const audience = body.audience === 'everyone' ? 'everyone' : 'not_selected';
      const kind = ['non_selection', 'thank_you', 'custom'].includes(body.kind) ? body.kind : 'thank_you';
      const club = await db.Club.get(plan.club_id).catch(() => null);

      const families = new Map<string, any[]>();
      for (const p of ctx.pool) {
        if (audience === 'not_selected' && acceptedPlayers.has(p.player_id || p.player_name)) continue;
        if (!p.guardian_email) continue;
        if (!families.has(p.guardian_email)) families.set(p.guardian_email, []);
        families.get(p.guardian_email)!.push(p);
      }
      if (!families.size) return Response.json({ error: 'Nobody matches that audience' }, { status: 400 });

      const subject = String(body.subject || '').trim()
        || (kind === 'non_selection' ? `Roster decisions for ${plan.title}` : `Thank you for trying out — ${plan.title}`);
      let sent = 0;
      let failed = 0;

      for (const [email, players] of families) {
        const names = players.map((p: any) => p.player_name);
        const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
        const opening = kind === 'non_selection'
          ? `Thank you for bringing ${list} to the ${plan.title}. It was a strong group and we were not able to offer every player a place this season. We would love to see ${names.length === 1 ? 'them' : 'them'} at our next tryout or open training.`
          : `Thank you for bringing ${list} to the ${plan.title}. We appreciate the time and effort your family put in.`;
        const text = [
          `Hi ${players[0].guardian_name || 'there'},`,
          '',
          opening,
          ...(body.message ? ['', String(body.message)] : []),
          '',
          'Thank you,',
          plan.lead_name ? `${plan.lead_name} · ${club?.name || 'the club'}` : (club?.name || 'the club'),
        ].join('\n');

        await sendTryoutNoticeEmail(base44, { to: email, subject, body: text })
          .then(() => { sent += 1; })
          .catch((e: any) => { console.error('tryout bulk message failed:', e?.message || e); failed += 1; });
        await db.Notification.create({
          club_id: plan.club_id, user_email: email, type: 'announcement', delivery: 'push',
          title: subject,
          message: opening,
        }).catch(() => null);
      }
      return Response.json({ ok: true, sent, failed, families: families.size, audience, kind });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('tryout-offers error:', error);
    return Response.json({ error: error?.message || 'The offer service failed' }, { status: 500 });
  }
}