// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { waitUntil } from '@/legacy-functions/_runtime';

/**
 * The tryout evaluation service.
 *
 *  save    — one coach's evaluation of one player at one session (upsert).
 *  results — the scored list for a session, or the combined ranking for a whole
 *            tryout. A coach only ever receives their own scores unless the
 *            admin has revealed evaluator scores on that session; admins get
 *            every evaluator, the per-criterion averages and the disagreement
 *            flags.
 */

const DEFAULT_CRITERIA = [
  { key: 'technical', label: 'Technical skill' },
  { key: 'tactical', label: 'Tactical awareness' },
  { key: 'athleticism', label: 'Athleticism' },
  { key: 'attitude', label: 'Attitude' },
];

const RECOMMENDATIONS = ['offer', 'waitlist', 'not_selected', 'needs_look'];
const ADMIN_ROLES = ['master_admin', 'admin', 'club_director', 'club_admin', 'branch_director', 'branch_admin'];

const isClubAdmin = (u: any) => !!u && (u.role === 'admin' || u.is_super_admin === true || ADMIN_ROLES.includes(u.custom_role || ''));
const clubOf = (u: any) => u?.data?.club_id || u?.club_id || '';
const notFound = (e: any) => (e.status === 404 ? null : Promise.reject(e));
const round1 = (n: number) => Math.round(n * 10) / 10;

function criteriaFor(event: any) {
  const list = Array.isArray(event?.evaluation_criteria) ? event.evaluation_criteria.filter((c: any) => c && c.key) : [];
  return list.length ? list : DEFAULT_CRITERIA;
}

/** A coach works a session they are assigned to evaluate, run, own, or lead. */
function isAssigned(event: any, plan: any, user: any) {
  if (!event || !user) return false;
  if ((event.evaluator_ids || []).includes(user.id)) return true;
  if (event.responsible_user_id && event.responsible_user_id === user.id) return true;
  if (event.owner_user_id && event.owner_user_id === user.id) return true;
  if (plan?.lead_user_id && plan.lead_user_id === user.id) return true;
  return false;
}

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

/** Read every page of a filtered query (the SDK returns one page at a time). */
async function paged(filterFn: any, query: any, sort?: string, max = 3000) {
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

/** Per-criterion averages, the combined score and where evaluators disagree. */
function aggregate(evals: any[], criteria: any[]) {
  const count = evals.length;
  if (!count) return { count: 0 };
  const criteriaAvg: any = {};
  let worstCriteriaSpread = 0;
  for (const c of criteria) {
    const vals = evals.map((e) => Number(e.criteria_scores?.[c.key])).filter((v) => v >= 1 && v <= 5);
    if (!vals.length) continue;
    criteriaAvg[c.key] = round1(vals.reduce((s, v) => s + v, 0) / vals.length);
    worstCriteriaSpread = Math.max(worstCriteriaSpread, Math.max(...vals) - Math.min(...vals));
  }
  const grades = evals.map((e) => Number(e.overall_grade)).filter((v) => v > 0);
  const criteriaValues: number[] = Object.values(criteriaAvg);
  const overall = grades.length
    ? round1(grades.reduce((s, v) => s + v, 0) / grades.length)
    : criteriaValues.length
      ? round1(criteriaValues.reduce((s, v) => s + v, 0) / criteriaValues.length)
      : 0;
  const spread = grades.length > 1 ? round1(Math.max(...grades) - Math.min(...grades)) : 0;
  const recs = evals.map((e) => e.recommendation).filter(Boolean);
  const recSplit = recs.includes('offer') && recs.some((r) => r === 'not_selected' || r === 'waitlist');
  return {
    count,
    criteria: criteriaAvg,
    overall,
    spread,
    criteria_spread: worstCriteriaSpread,
    rec_split: recSplit,
    disagreement: count > 1 && (spread >= 2 || worstCriteriaSpread >= 2 || recSplit),
  };
}

/** Keep the session's evaluated-player count in step with what has been scored. */
async function refreshEvaluatedCount(base44: any, eventId: string, current: number) {
  const rows = await paged((q: any, o: any) => base44.asServiceRole.entities.TryoutEvaluation.filter(q, o), { tryout_event_id: eventId }, null, 3000);
  const players = new Set(rows.map((r: any) => r.player_id || r.player_name));
  if (players.size !== current) {
    await base44.asServiceRole.entities.TryoutEvent.update(eventId, { evaluated_count: players.size });
  }
}

async function saveEvaluation(base44: any, me: any, body: any) {
  const { event_id, registration_id, player_id, scores, overall_grade, recommendation, notes } = body || {};
  if (!event_id) return Response.json({ error: 'event_id is required' }, { status: 400 });
  if (!registration_id && !player_id) return Response.json({ error: 'registration_id is required' }, { status: 400 });

  const event = await base44.entities.TryoutEvent.get(event_id).catch(notFound);
  if (!event) return Response.json({ error: 'Session not found' }, { status: 404 });

  const admin = isClubAdmin(me);
  const myClub = clubOf(me);
  if (myClub && event.club_id && myClub !== event.club_id && !admin) {
    return Response.json({ error: 'Forbidden — this session belongs to another club' }, { status: 403 });
  }

  const plan = event.tryout_plan_id
    ? await base44.entities.TryoutPlan.get(event.tryout_plan_id).catch(notFound)
    : null;
  if (!admin && !isAssigned(event, plan, me)) {
    return Response.json({ error: 'You are not assigned to evaluate this session' }, { status: 403 });
  }

  const registration = registration_id
    ? await base44.entities.TryoutRegistration.get(registration_id).catch(notFound)
    : null;
  const reg = registration || (await base44.entities.TryoutRegistration.filter({ tryout_event_id: event_id, player_id }, null, 1))[0];
  if (!reg || reg.tryout_event_id !== event_id) {
    return Response.json({ error: 'That player is not in this session' }, { status: 400 });
  }

  // A coach never scores their own child: the family email on the signup is the
  // coach's own. Admins keep the override so a mis-tagged family can be fixed.
  if (!admin && event.evaluation_block_own_child !== false) {
    const guardian = reg.guardian_id
      ? await base44.entities.Guardian.get(reg.guardian_id).catch(notFound)
      : null;
    const familyEmails = [reg.guardian_email, guardian?.email]
      .filter(Boolean)
      .map((e: string) => String(e).toLowerCase());
    if (familyEmails.includes(String(me.email || '').toLowerCase())) {
      return Response.json(
        { error: "You can't evaluate your own child — ask another coach on this session to score them." },
        { status: 403 }
      );
    }
  }

  const criteria = criteriaFor(event);
  const cleanScores: any = {};
  for (const c of criteria) {
    const value = Math.round(Number(scores?.[c.key]));
    if (value >= 1 && value <= 5) cleanScores[c.key] = value;
  }
  const grade = Math.round(Number(overall_grade));
  const player = reg.player_id ? await base44.entities.Player.get(reg.player_id).catch(notFound) : null;

  const data: any = {
    club_id: reg.club_id || event.club_id || myClub || '',
    tryout_plan_id: event.tryout_plan_id || '',
    tryout_event_id: event.id,
    season_name: plan?.season || reg.season_name || '',
    player_id: reg.player_id || '',
    player_name: reg.player_name || [player?.first_name, player?.last_name].filter(Boolean).join(' '),
    player_bib: reg.bib_number ?? null,
    player_photo_url: player?.photo_url || '',
    player_age: ageOn(reg.player_date_of_birth || player?.date_of_birth, event.date),
    age_group: reg.desired_age_group || plan?.age_group || '',
    player_gender: reg.player_gender || plan?.gender || '',
    guardian_email: reg.guardian_email || guardianEmailOf(player) || '',
    evaluator_user_id: me.id,
    evaluator_email: me.email,
    evaluator_name: me.full_name || me.email,
    criteria_scores: cleanScores,
    overall_grade: grade >= 1 && grade <= 5 ? grade : 0,
    recommendation: RECOMMENDATIONS.includes(recommendation) ? recommendation : '',
    notes: typeof notes === 'string' ? notes.slice(0, 4000) : '',
    status: 'submitted',
    saved_at: new Date().toISOString(),
  };

  const existing = await base44.entities.TryoutEvaluation.filter(
    { tryout_event_id: event.id, player_id: data.player_id || data.player_name, evaluator_email: me.email },
    null,
    1
  );
  const record = existing[0]
    ? await base44.entities.TryoutEvaluation.update(existing[0].id, data)
    : await base44.entities.TryoutEvaluation.create(data);

  waitUntil(refreshEvaluatedCount(base44, event.id, Number(event.evaluated_count) || 0).catch(() => null));
  return Response.json({ ok: true, evaluation: record });
}

function guardianEmailOf(player: any) {
  return player?.guardian_email || '';
}

async function loadResults(base44: any, me: any, body: any) {
  const { event_id, plan_id } = body || {};
  const admin = isClubAdmin(me);

  let events: any[] = [];
  if (event_id) {
    const event = await base44.entities.TryoutEvent.get(event_id).catch(notFound);
    if (!event) return Response.json({ error: 'Session not found' }, { status: 404 });
    events = [event];
  } else if (plan_id) {
    events = await paged((q: any, o: any) => base44.entities.TryoutEvent.filter(q, o), { tryout_plan_id: plan_id }, 'date');
  } else {
    return Response.json({ error: 'event_id or plan_id is required' }, { status: 400 });
  }

  const myClub = clubOf(me);
  if (!admin && myClub) events = events.filter((e: any) => !e.club_id || e.club_id === myClub);
  if (!events.length) {
    return Response.json({ ok: true, is_admin: admin, can_see_others: admin, criteria: DEFAULT_CRITERIA, events: [], rows: [], stats: {} });
  }

  const planIds: string[] = [...new Set(events.map((e: any) => e.tryout_plan_id).filter(Boolean))];
  const plans = planIds.length
    ? await paged((q: any, o: any) => base44.entities.TryoutPlan.filter(q, o), { id: { $in: planIds } })
    : [];
  const planById: any = Object.fromEntries(plans.map((p: any) => [p.id, p]));

  const assigned = (e: any) => isAssigned(e, planById[e.tryout_plan_id], me);
  if (!admin && !events.some(assigned)) {
    return Response.json({ error: 'You are not assigned to these tryout sessions' }, { status: 403 });
  }
  const scoped = admin ? events : events.filter(assigned);
  const eventIds = scoped.map((e: any) => e.id);

  const criteriaKeys = new Map<string, string>();
  scoped.forEach((e: any) => criteriaFor(e).forEach((c: any) => {
    if (!criteriaKeys.has(c.key)) criteriaKeys.set(c.key, c.label);
  }));
  const criteriaList = [...criteriaKeys].map(([key, label]) => ({ key, label }));

  const allRegs = await paged((q: any, o: any) => base44.entities.TryoutRegistration.filter(q, o), { tryout_event_id: { $in: eventIds } }, 'player_name');
  const regs = allRegs.filter((r: any) => r.status !== 'cancelled');

  // Evaluations are read with the service role because a revealed session lets
  // coaches see scores written by other coaches.
  const allEvals = await paged((q: any, o: any) => base44.asServiceRole.entities.TryoutEvaluation.filter(q, o), { tryout_event_id: { $in: eventIds } }, '-created_date');

  const playerIds: string[] = [...new Set(regs.map((r: any) => r.player_id).filter(Boolean))];
  const players: any[] = [];
  for (let i = 0; i < playerIds.length; i += 200) {
    const found = await paged((q: any, o: any) => base44.entities.Player.filter(q, o), { id: { $in: playerIds.slice(i, i + 200) } });
    players.push(...found);
  }
  const playerById: any = Object.fromEntries(players.map((p: any) => [p.id, p]));

  const evalGroups = new Map<string, any[]>();
  for (const e of allEvals) {
    const key = `${e.tryout_event_id}:${e.player_id || e.player_name}`;
    if (!evalGroups.has(key)) evalGroups.set(key, []);
    evalGroups.get(key)!.push(e);
  }
  const eventById: any = Object.fromEntries(scoped.map((e: any) => [e.id, e]));

  const rows = regs.map((r: any) => {
    const event = eventById[r.tryout_event_id] || {};
    const player = playerById[r.player_id] || null;
    const group = evalGroups.get(`${r.tryout_event_id}:${r.player_id || r.player_name}`) || [];
    const shares = admin || event.evaluation_share_scores === true;
    const mine = group.find((e: any) => e.evaluator_email === me.email) || null;
    return {
      registration_id: r.id,
      event_id: r.tryout_event_id,
      player_id: r.player_id || '',
      player_name: r.player_name || [player?.first_name, player?.last_name].filter(Boolean).join(' '),
      photo_url: player?.photo_url || '',
      bib: r.bib_number ?? null,
      age: ageOn(r.player_date_of_birth || player?.date_of_birth, event.date),
      age_group: r.desired_age_group || '',
      player_gender: r.player_gender || '',
      guardian_email: r.guardian_email || '',
      checked_in: !!r.checked_in,
      registration_status: r.status || '',
      evaluations_count: group.length,
      mine: mine
        ? {
            scores: mine.criteria_scores || {},
            overall_grade: mine.overall_grade || 0,
            recommendation: mine.recommendation || '',
            notes: mine.notes || '',
            saved_at: mine.saved_at || '',
          }
        : null,
      aggregate: shares ? aggregate(group, criteriaList) : null,
      evaluators: shares
        ? group
            .map((g: any) => ({
              name: g.evaluator_name || g.evaluator_email || 'Coach',
              email: g.evaluator_email || '',
              is_me: g.evaluator_email === me.email,
              scores: g.criteria_scores || {},
              overall_grade: g.overall_grade || 0,
              recommendation: g.recommendation || '',
              notes: g.notes || '',
              saved_at: g.saved_at || '',
            }))
            .sort((a: any, b: any) => (b.overall_grade || 0) - (a.overall_grade || 0))
        : null,
    };
  });

  // Combined ranking inside each age group + gender.
  const byGroup = new Map<string, any[]>();
  for (const row of rows) {
    row.group_key = `${row.age_group || 'No age group'} · ${row.player_gender || 'Open'}`;
    row.rank = null;
    if (!row.aggregate?.overall) continue;
    if (!byGroup.has(row.group_key)) byGroup.set(row.group_key, []);
    byGroup.get(row.group_key)!.push(row);
  }
  for (const list of byGroup.values()) {
    list.sort((a, b) => (b.aggregate.overall - a.aggregate.overall) || (b.aggregate.count - a.aggregate.count));
    list.forEach((row, i) => { row.rank = i + 1; });
  }

  const evaluatorEmails = [...new Set(allEvals.map((e: any) => e.evaluator_email).filter(Boolean))];
  return Response.json({
    ok: true,
    is_admin: admin,
    can_see_others: admin || scoped.some((e: any) => e.evaluation_share_scores === true),
    criteria: criteriaList,
    events: scoped.map((e: any) => ({
      id: e.id,
      type: e.type,
      date: e.date,
      start_time: e.start_time || '',
      end_time: e.end_time || '',
      field_name: e.field_name || e.location || '',
      tryout_plan_id: e.tryout_plan_id || '',
      plan_title: planById[e.tryout_plan_id]?.title || '',
      capacity: e.capacity || 0,
      registration_count: e.registration_count || 0,
      checked_in_count: e.checked_in_count || 0,
      evaluated_count: e.evaluated_count || 0,
      evaluation_share_scores: e.evaluation_share_scores === true,
      evaluation_block_own_child: e.evaluation_block_own_child !== false,
      evaluation_criteria: criteriaFor(e),
    })),
    rows,
    stats: {
      players: rows.length,
      scorable: rows.length,
      scored: rows.filter((r: any) => r.aggregate?.overall > 0).length,
      scored_by_me: rows.filter((r: any) => r.mine && Object.keys(r.mine.scores || {}).length > 0).length,
      evaluations: allEvals.length,
      evaluators: evaluatorEmails.length,
      disagreements: rows.filter((r: any) => r.aggregate?.disagreement).length,
      awaiting: rows.filter((r: any) => !r.mine || !Object.keys(r.mine.scores || {}).length).length,
    },
  });
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    if (action === 'save') return await saveEvaluation(base44, me, body);
    if (action === 'results') return await loadResults(base44, me, body);
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Evaluation service failed' }, { status: 500 });
  }
}