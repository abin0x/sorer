// @ts-nocheck
// The tryout offers + roster domain.
//
// A TryoutOffer row is one player's place on one team's list for one tryout.
// list_type says where they sit (roster or waitlist) and status says how far the
// offer has got (proposed → pending → sent → accepted / declined / expired).
// Everything a club must not get wrong — who may hold an offer, when it lapses,
// who moves up next — is decided here so the offer service and the nightly
// reminders agree.

import { sendTryoutOfferEmail, formatOfferExpiry } from './tryoutEmails.ts';

export const ADMIN_ROLES = ['master_admin', 'admin', 'club_director', 'club_admin', 'branch_director', 'branch_admin'];

/** Statuses that are finished — the row never counts towards a spot again. */
export const TERMINAL = ['declined', 'expired', 'withdrawn'];

/** A player holding one of these already has an offer in their hands. */
export const HOLDS = ['sent', 'accepted'];

/** Statuses that count as being on a team's list. */
export const ON_LIST = ['proposed', 'pending', 'sent', 'accepted'];

export const isClubAdmin = (u: any) => !!u && (u.role === 'admin' || u.is_super_admin === true || ADMIN_ROLES.includes(u.custom_role || ''));
export const clubOf = (u: any) => u?.data?.club_id || u?.club_id || '';
export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Read every page of a filtered query (the SDK returns one page at a time). */
export async function paged(filterFn: any, query: any, sort?: string, max = 3000) {
  const out: any[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 8; i++) {
    const page = await filterFn(query, cursor ? { sort, limit: 500, cursor } : { sort, limit: 500 });
    if (Array.isArray(page)) {
      out.push(...page);
      break;
    }
    out.push(...(page?.items || []));
    if (!page?.has_more || !page?.next_cursor) break;
    cursor = page.next_cursor;
    if (out.length >= max) break;
  }
  return out.slice(0, max);
}

/** Every evaluator's score for a player, averaged into one combined score. */
export function combinedScores(evals: any[]) {
  const byPlayer = new Map<string, number[]>();
  for (const e of evals) {
    const key = e.player_id || e.player_name;
    if (!key) continue;
    const values = [Number(e.overall_grade) || 0, ...Object.values(e.criteria_scores || {}).map((v: any) => Number(v))]
      .filter((v) => v > 0);
    if (!values.length) continue;
    if (!byPlayer.has(key)) byPlayer.set(key, []);
    byPlayer.get(key)!.push(values.reduce((s, v) => s + v, 0) / values.length);
  }
  const out: Record<string, number> = {};
  for (const [key, list] of byPlayer) out[key] = round1(list.reduce((s, v) => s + v, 0) / list.length);
  return out;
}

/** Spots on a team: how many are filled, how many offers are out, what's left. */
export function spotsFor(team: any, offers: any[]) {
  const total = Number(team?.max_roster_size) || 18;
  const taken = offers.filter((o) => o.status === 'accepted').length;
  const open = offers.filter((o) => o.status === 'sent').length;
  return { total, taken, open, remaining: Math.max(0, total - taken), free: Math.max(0, total - taken - open) };
}

/** The next player in the waitlist order who isn't already holding an offer. */
export async function nextWaitlisted(db: any, plan: any, team: any, skip: string[] = []) {
  const rows = await db.TryoutOffer.filter({ tryout_plan_id: plan.id, team_id: team.id, list_type: 'waitlist' }, 'rank', 300).catch(() => []);
  const candidates = rows
    .filter((r: any) => !TERMINAL.includes(r.status) && !skip.includes(r.id))
    .sort((a: any, b: any) => (Number(a.rank) || 999) - (Number(b.rank) || 999));
  for (const row of candidates) {
    if (await playerHoldsOffer(db, row, plan.club_id)) continue;
    return row;
  }
  return null;
}

/** The active offer this player already holds somewhere, if any. */
export async function playerHoldsOffer(db: any, offer: any, clubId: string) {
  const query: any = offer.player_id
    ? { club_id: clubId, player_id: offer.player_id }
    : { club_id: clubId, player_name: offer.player_name };
  const rows = await db.TryoutOffer.filter(query, null, 200).catch(() => []);
  return rows.find((r: any) => r.id !== offer.id && HOLDS.includes(r.status)) || null;
}

/** A spot is gone and no more offers are out: everyone else on this player's
 *  other lists is stood down, so the family is never holding two offers. */
export async function standDownOtherLists(db: any, offer: any) {
  const query: any = offer.player_id
    ? { club_id: offer.club_id, player_id: offer.player_id }
    : { club_id: offer.club_id, player_name: offer.player_name };
  const rows = await db.TryoutOffer.filter(query, null, 200).catch(() => []);
  const others = rows.filter((r: any) => r.id !== offer.id && ['proposed', 'pending', 'sent'].includes(r.status));
  for (const row of others) {
    await db.TryoutOffer.update(row.id, {
      status: 'withdrawn',
      history: [...(row.history || []), { at: new Date().toISOString(), by: 'system', action: 'withdrawn', note: `Stood down — accepted a spot at ${offer.team_name}` }],
    }).catch(() => null);
  }
  return others.length;
}

/** Hand the offer to the family: status, deadline, email and in-app notice. */
export async function sendOffer(db: any, base44: any, { offer, plan, team, appUrl }: any) {
  const now = new Date().toISOString();
  const hours = Number(plan?.offer_expiry_hours) || 72;
  const expiresAt = new Date(Date.now() + hours * 3600000).toISOString();
  const link = `${appUrl}/TryoutStatus?club=${offer.club_id}&email=${encodeURIComponent(offer.guardian_email || '')}`;

  const updated = await db.TryoutOffer.update(offer.id, {
    status: 'sent',
    list_type: 'roster',
    sent_at: now,
    expires_at: expiresAt,
    approved_at: offer.approved_at || now,
    history: [...(offer.history || []), { at: now, by: 'club', action: 'offer_sent', note: `Offer sent — expires ${expiresAt}` }],
  });

  if (offer.registration_id) {
    await db.TryoutRegistration.update(offer.registration_id, { pool_status: 'offered' }).catch(() => null);
  }
  if (offer.guardian_email) {
    await sendTryoutOfferEmail(base44, {
      to: offer.guardian_email, offer: updated, team, plan, respondUrl: link,
    }).catch((e: any) => console.error('tryout offer email failed:', e?.message || e));
    await db.Notification.create({
      club_id: offer.club_id,
      user_email: offer.guardian_email,
      type: 'announcement',
      delivery: 'push',
      title: `Roster offer: ${offer.player_name} → ${offer.team_name}`,
      message: `${plan?.title || 'Tryout'} — ${offer.player_name} has an offer for ${offer.team_name}. ${Number(offer.fee_amount) > 0 ? `Fees due $${Number(offer.fee_amount).toFixed(2)}. ` : ''}Respond by ${formatOfferExpiry(expiresAt)}.`,
      link,
    }).catch(() => null);
  }
  return updated;
}

/** A spot opened up: move the next player in the waitlist order up and offer it. */
export async function promoteNextWaitlisted(db: any, base44: any, { plan, team, appUrl, byEmail }: any) {
  const next = await nextWaitlisted(db, plan, team);
  if (!next) return null;
  const now = new Date().toISOString();
  const rosterRanks = await db.TryoutOffer.filter({ tryout_plan_id: plan.id, team_id: team.id, list_type: 'roster' }, 'rank', 300).catch(() => []);
  const nextRank = rosterRanks.reduce((m: number, r: any) => Math.max(m, Number(r.rank) || 0), 0) + 1;
  const direct = (plan.offer_approval_mode || 'admin_approval') === 'coach_direct';

  const promoted = await db.TryoutOffer.update(next.id, {
    list_type: 'roster',
    rank: nextRank,
    status: direct ? 'pending' : 'proposed',
    history: [...(next.history || []), { at: now, by: byEmail || 'system', action: 'promoted', note: 'Moved up from the waitlist' }],
  });

  if (direct) return await sendOffer(db, base44, { offer: promoted, plan, team, appUrl });
  return promoted;
}

/** Every offer past its deadline expires, and its spot moves down the waitlist. */
export async function expireStaleOffers(db: any, base44: any, { club_id, plan_id, appUrl }: any) {
  const query: any = { status: 'sent' };
  if (plan_id) query.tryout_plan_id = plan_id;
  else if (club_id) query.club_id = club_id;
  const rows = await paged((q: any, o: any) => db.TryoutOffer.filter(q, o), query, 'expires_at', 1000);
  const now = Date.now();
  const stale = rows.filter((r: any) => r.expires_at && new Date(r.expires_at).getTime() < now);
  const results: any[] = [];

  for (const offer of stale) {
    const at = new Date().toISOString();
    await db.TryoutOffer.update(offer.id, {
      status: 'expired',
      response_channel: 'auto',
      history: [...(offer.history || []), { at, by: 'system', action: 'expired', note: 'The family did not respond in time' }],
    }).catch(() => null);
    if (offer.registration_id) {
      await db.TryoutRegistration.update(offer.registration_id, { pool_status: 'registered' }).catch(() => null);
    }
    const plan = await db.TryoutPlan.get(offer.tryout_plan_id).catch(() => null);
    const team = await db.Team.get(offer.team_id).catch(() => null);
    let promoted: any = null;
    if (plan && team && !plan.roster_locked) {
      promoted = await promoteNextWaitlisted(db, base44, { plan, team, appUrl, byEmail: 'system' }).catch(() => null);
    }
    results.push({ offer_id: offer.id, player_name: offer.player_name, promoted: promoted?.player_name || null });
  }
  return { expired: results.length, results };
}

/** The family said yes: the spot is theirs and final registration opens. */
export async function acceptOffer(db: any, { offer, plan, team, channel, byEmail }: any) {
  const now = new Date().toISOString();
  let inviteId = offer.final_registration_id || '';
  if (!inviteId) {
    const existing = await db.TryoutFinalRegistration.filter({ tryout_plan_id: plan.id, player_id: offer.player_id }, null, 1).catch(() => []);
    inviteId = existing[0]?.id || '';
  }
  if (!inviteId) {
    const invite = await db.TryoutFinalRegistration.create({
      club_id: offer.club_id,
      tryout_plan_id: plan.id,
      player_id: offer.player_id,
      player_name: offer.player_name,
      team_id: offer.team_id,
      team_name: offer.team_name,
      guardian_id: offer.guardian_id || '',
      guardian_email: offer.guardian_email || '',
      amount_due: Number(offer.fee_amount || team?.cost || 0),
      status: 'invited',
      invited_date: now,
    }).catch(() => null);
    inviteId = invite?.id || '';
  }

  const updated = await db.TryoutOffer.update(offer.id, {
    status: 'accepted',
    responded_at: now,
    response_channel: channel,
    final_registration_id: inviteId,
    history: [...(offer.history || []), { at: now, by: byEmail || 'family', action: 'accepted', note: 'Offer accepted' }],
  });
  if (offer.registration_id) {
    await db.TryoutRegistration.update(offer.registration_id, { pool_status: 'accepted' }).catch(() => null);
  }
  await standDownOtherLists(db, updated);
  return { offer: updated, invite_id: inviteId };
}

/** The family said no: the spot is released to the next player in line. */
export async function declineOffer(db: any, { offer, channel, byEmail, note }: any) {
  const now = new Date().toISOString();
  const updated = await db.TryoutOffer.update(offer.id, {
    status: 'declined',
    responded_at: now,
    response_channel: channel,
    response_note: note || '',
    history: [...(offer.history || []), { at: now, by: byEmail || 'family', action: 'declined', note: note || 'Offer declined' }],
  });
  if (offer.registration_id) {
    await db.TryoutRegistration.update(offer.registration_id, { pool_status: 'declined' }).catch(() => null);
  }
  return updated;
}

/** Locks a tryout's rosters onto the teams. */
export async function finalizeTeams(db: any, plan: any, offers: any[]) {
  const teamIds: string[] = plan.team_ids || [];
  if (!teamIds.length) return { teams: 0, players: 0 };
  const teams = await db.Team.filter({ id: { $in: teamIds } }, null, 200);
  const accepted = offers.filter((o: any) => o.status === 'accepted' && o.player_id);
  let touched = 0;
  let placed = 0;

  for (const team of teams) {
    const ids = [...new Set(accepted.filter((o: any) => o.team_id === team.id).map((o: any) => o.player_id))];
    if (!ids.length) continue;
    const merged = [...new Set([...(team.player_ids || []), ...ids])];
    await db.Team.update(team.id, { player_ids: merged, status: 'active' });
    await db.Player.bulkUpdate(
      ids.map((id: string) => ({ id, team_id: team.id, team_name: team.name, age_group: team.age_group || '', status: 'active' })),
    );
    touched += 1;
    placed += ids.length;
  }
  return { teams: touched, players: placed };
}

/** Locks the roster for a tryout: the teams are updated and no more offers go out. */
export async function lockRoster(db: any, plan: any, offers: any[], byEmail: string) {
  const placed = await finalizeTeams(db, plan, offers);
  const at = new Date().toISOString();
  const updated = await db.TryoutPlan.update(plan.id, {
    roster_locked: true,
    roster_finalized_at: at,
    roster_finalized_by: byEmail,
    status: 'rosters_finalized',
  });
  return { plan: updated, ...placed };
}

/** Every spot on every team is taken — the rosters finalize themselves. */
export async function autoFinalizeIfFull(db: any, plan: any) {
  if (plan.roster_locked) return null;
  const teamIds: string[] = plan.team_ids || [];
  if (!teamIds.length) return null;
  const [teams, offers] = await Promise.all([
    db.Team.filter({ id: { $in: teamIds } }, null, 200).catch(() => []),
    paged((q: any, o: any) => db.TryoutOffer.filter(q, o), { tryout_plan_id: plan.id }, 'rank', 2000),
  ]);
  if (!teams.length) return null;
  const allFull = teams.every((t: any) => {
    const spots = spotsFor(t, offers.filter((o: any) => o.team_id === t.id));
    return spots.total > 0 && spots.remaining === 0;
  });
  if (!allFull) return null;
  return await lockRoster(db, plan, offers, 'auto — all spots filled');
}

/** The family's own offers, for the public status page. */
export async function familyOffers(db: any, clubId: string, email: string) {
  const rows = await db.TryoutOffer.filter({ club_id: clubId, guardian_email: email }, '-created_date', 200).catch(() => []);
  const visible = rows.filter((r: any) => ['sent', 'accepted', 'declined', 'expired'].includes(r.status));
  const planIds: string[] = [...new Set(visible.map((r: any) => r.tryout_plan_id).filter(Boolean))];
  const plans: any = {};
  for (const id of planIds) plans[id] = await db.TryoutPlan.get(id).catch(() => null);
  return visible.map((r: any) => ({
    id: r.id,
    player_name: r.player_name,
    team_name: r.team_name,
    plan_title: plans[r.tryout_plan_id]?.title || 'Tryout',
    status: r.status,
    fee_amount: Number(r.fee_amount || 0),
    fee_note: r.fee_note || '',
    expires_at: r.expires_at || '',
    expires_label: r.status === 'sent' ? formatOfferExpiry(r.expires_at, plans[r.tryout_plan_id]?.timezone) : '',
    responded_at: r.responded_at || '',
    response_note: r.response_note || '',
    final_registration_id: r.final_registration_id || '',
  }));
}

export const offerStatusMeta = (status: string) => ({
  proposed: { label: 'Awaiting approval', tone: 'bg-amber-100 text-amber-800 border-amber-200' },
  pending: { label: 'Ready to send', tone: 'bg-sky-100 text-sky-800 border-sky-200' },
  sent: { label: 'Offer sent', tone: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  accepted: { label: 'Accepted', tone: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  declined: { label: 'Declined', tone: 'bg-rose-100 text-rose-800 border-rose-200' },
  expired: { label: 'Expired', tone: 'bg-rose-100 text-rose-800 border-rose-200' },
  withdrawn: { label: 'Withdrawn', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
}[status] || { label: status, tone: 'bg-muted text-muted-foreground border-border' });