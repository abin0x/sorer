// @ts-nocheck
// Shared compliance logic: governing body rules, expiration calc, status rules, audit + notifications.

export const REQUIREMENTS = ['background_check', 'safesport_certification'];
export const REQ_LABEL: Record<string, string> = {
  background_check: 'Background Check',
  safesport_certification: 'SafeSport Certification',
};
export const JUNE1_BODIES = ['gotsports', 'us_club_soccer'];
export const ADMIN_ROLES = ['club_admin', 'club_director', 'branch_director', 'master_admin', 'admin'];

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const parse = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return { y, m, d }; };
const plusYears = (n: number) => (s: string) => { const { y, m, d } = parse(s); return ymd(y + n, m, d); };
// Expires on the next May 31 on or after the completion date.
const nextMay31 = (s: string) => { const { y, m } = parse(s); return ymd(m > 5 ? y + 1 : y, 5, 31); };
// MLS Next: renewal in every even calendar year; a check done in year Y covers through Dec 31 of the following odd year.
const mlsBiennial = (s: string) => { const { y } = parse(s); const even = y % 2 === 0 ? y : y - 1; return ymd(even + 1, 12, 31); };

type Rule = { background_check: (s: string) => string; safesport_certification: (s: string) => string };
export const GOVERNING_RULES: Record<string, Rule> = {
  us_soccer: { background_check: plusYears(2), safesport_certification: plusYears(1) },
  girls_academy_league: { background_check: plusYears(1), safesport_certification: plusYears(1) },
  mls_next: { background_check: mlsBiennial, safesport_certification: plusYears(1) },
  gotsports: { background_check: plusYears(2), safesport_certification: nextMay31 },
  us_youth_soccer: { background_check: plusYears(2), safesport_certification: nextMay31 },
  us_club_soccer: { background_check: plusYears(2), safesport_certification: nextMay31 },
  michigan_youth_soccer: { background_check: plusYears(2), safesport_certification: plusYears(1) },
};

/** Expiration across all of the club's bodies: the earliest date satisfies every affiliation. */
export function calcExpiration(requirement: string, completion: string, bodies: string[]) {
  let best: { expiration_date: string; governing_body: string } | null = null;
  for (const b of bodies) {
    const rule = GOVERNING_RULES[b];
    if (!rule) continue;
    const exp = rule[requirement as keyof Rule](completion);
    if (!best || exp < best.expiration_date) best = { expiration_date: exp, governing_body: b };
  }
  return best;
}

export const today = () => new Date().toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const seasonStartYear = (name = '') => { const m = String(name).match(/(\d{4})/); return m ? Number(m[1]) : new Date().getUTCFullYear(); };

/** Re-evaluates a record that was approved. Returns approved | expiring_soon | expired. */
export function evaluateApproved(rec: any, seasonName: string) {
  const t = today();
  if (!rec.expiration_date || rec.expiration_date < t) return 'expired';
  // Rule 6: June 1 cutoff bodies need a SafeSport certificate dated on/after June 1 of the season year.
  const bodies = rec.governing_bodies?.length ? rec.governing_bodies : [rec.governing_body];
  if (rec.requirement_type === 'safesport_certification' && bodies.some((b: string) => JUNE1_BODIES.includes(b))
      && rec.completion_date < ymd(seasonStartYear(seasonName), 6, 1)) return 'expired';
  if (rec.expiration_date <= addDays(t, 30)) return 'expiring_soon';
  return 'approved';
}

export async function getSettings(db: any, clubId: string) {
  const rows = await db.ComplianceSettings.filter({ club_id: clubId }, { limit: 1 });
  const list = Array.isArray(rows) ? rows : rows.items || [];
  return list[0] || null;
}

export async function getActiveSeason(db: any, clubId: string) {
  const rows = await db.Season.filter({ club_id: clubId, status: 'active' }, { limit: 1 });
  const list = Array.isArray(rows) ? rows : rows.items || [];
  return list[0] || null;
}

export async function audit(db: any, rec: any, oldStatus: string | null, newStatus: string, by: string, notes = '') {
  await db.ComplianceAuditLog.create({
    club_id: rec.club_id, record_id: rec.id, coach_email: rec.coach_email, requirement_type: rec.requirement_type,
    season_name: rec.season_name, old_status: oldStatus || '', new_status: newStatus, changed_by: by,
    changed_at: new Date().toISOString(), notes,
  });
}

export async function notify(db: any, clubId: string, email: string, title: string, message: string, link = '/MyCompliance') {
  if (!email) return;
  await db.Notification.create({ club_id: clubId, user_email: email, type: 'announcement', delivery: 'push', title, message, link });
}

/** Admins to alert: club admins/directors, plus the record's branch director when scoped to a branch. */
export async function adminEmails(db: any, clubId: string, branchId?: string, onlyTop = false) {
  const emails = new Set<string>();
  const users = await db.User.filter({ club_id: clubId }, { limit: 500 }).catch(() => []);
  const list = Array.isArray(users) ? users : users.items || [];
  const roles = onlyTop ? ['club_director', 'club_admin'] : ['club_admin', 'club_director'];
  for (const u of list) if (roles.includes(u.custom_role)) emails.add(u.email);
  if (branchId && !onlyTop) {
    const loc = await db.Location.get(branchId).catch(() => null);
    if (loc?.branch_director_email) emails.add(loc.branch_director_email);
  }
  return [...emails];
}

/** Rules 1, 2, 3, 4, 5, 6 for one club. Idempotent. */
export async function runRulesForClub(db: any, clubId: string) {
  const [settings, season] = await Promise.all([getSettings(db, clubId), getActiveSeason(db, clubId)]);
  const bodies: string[] = settings?.governing_bodies || [];
  if (!season || bodies.length === 0) return { skipped: true };
  const stats = { created: 0, carried: 0, expiring: 0, expired: 0, escalated: 0 };
  const toEmail: { email: string; name: string; item: string }[] = [];

  const cRes = await db.Coach.filter({ club_id: clubId, status: 'active' }, { limit: 1000 });
  const coaches = Array.isArray(cRes) ? cRes : cRes.items || [];
  const rRes = await db.ComplianceRecord.filter({ club_id: clubId }, { limit: 5000 });
  const all = Array.isArray(rRes) ? rRes : rRes.items || [];
  const mine = all.filter((r: any) => r.season_id === season.id);
  const key = (r: any) => `${(r.coach_email || '').toLowerCase()}|${r.requirement_type}`;
  const existing = new Set(mine.map(key));
  const t = today();

  // Rules 1 + 5: generate missing records; carry forward still-valid approved ones from earlier seasons.
  for (const c of coaches) {
    for (const req of REQUIREMENTS) {
      const k = `${c.email.toLowerCase()}|${req}`;
      if (existing.has(k)) continue;
      const base = {
        club_id: clubId, branch_id: c.location_id || '', branch_name: c.location_name || '', coach_email: c.email,
        coach_name: `${c.first_name} ${c.last_name}`.trim(), season_id: season.id, season_name: season.name,
        requirement_type: req, governing_bodies: bodies, governing_body: bodies[0], resubmission_count: 0,
      };
      const prior = all.filter((r: any) => key(r) === k && r.season_id !== season.id && ['approved', 'expiring_soon'].includes(r.status)
        && r.document_url && evaluateApproved(r, season.name) !== 'expired')
        .sort((a: any, b: any) => (b.expiration_date || '').localeCompare(a.expiration_date || ''))[0];
      const created = prior
        ? await db.ComplianceRecord.create({ ...base, document_url: prior.document_url, document_name: prior.document_name, completion_date: prior.completion_date,
            expiration_date: prior.expiration_date, governing_body: prior.governing_body, status: evaluateApproved(prior, season.name),
            reviewed_by: prior.reviewed_by, reviewed_at: prior.reviewed_at, submitted_at: prior.submitted_at, carried_forward_from: prior.season_id })
        : await db.ComplianceRecord.create({ ...base, status: 'missing' });
      await audit(db, created, null, created.status, 'system', prior ? 'Carried forward from previous season' : 'Season start: record generated');
      prior ? stats.carried++ : stats.created++;
    }
  }

  // Rules 2, 3, 6: re-evaluate approved records.
  for (const r of mine.filter((x: any) => ['approved', 'expiring_soon'].includes(x.status))) {
    const next = evaluateApproved(r, season.name);
    if (next === r.status) continue;
    await db.ComplianceRecord.update(r.id, { status: next });
    await audit(db, r, r.status, next, 'system', next === 'expired' ? 'Expiration passed' : 'Expires within 30 days');
    const label = REQ_LABEL[r.requirement_type];
    if (next === 'expiring_soon') {
      stats.expiring++;
      await notify(db, clubId, r.coach_email, 'Compliance expiring soon', `Your ${label} expires on ${r.expiration_date}. Please renew and upload your new certificate.`);
      for (const e of await adminEmails(db, clubId, r.branch_id)) await notify(db, clubId, e, 'Coach compliance expiring', `${r.coach_name}'s ${label} expires on ${r.expiration_date}.`, '/Compliance');
      toEmail.push({ email: r.coach_email, name: r.coach_name || '', item: `${label} expires on ${r.expiration_date}` });
    } else if (next === 'expired') {
      stats.expired++;
      await notify(db, clubId, r.coach_email, 'Compliance expired', `Your ${label} has expired. You are no longer compliant and cannot be assigned to a team until renewed.`);
      toEmail.push({ email: r.coach_email, name: r.coach_name || '', item: `${label} has expired` });
    }
  }

  // Rule 4: flagged and not resubmitted within 7 days -> escalate to club director.
  for (const r of mine.filter((x: any) => x.status === 'flagged' && !x.escalated_at && x.reviewed_at && x.reviewed_at.slice(0, 10) <= addDays(t, -7))) {
    await db.ComplianceRecord.update(r.id, { escalated_at: new Date().toISOString() });
    await audit(db, r, 'flagged', 'flagged', 'system', 'Escalated: not resubmitted within 7 days');
    for (const e of await adminEmails(db, clubId, undefined, true)) await notify(db, clubId, e, 'Compliance flag escalated', `${r.coach_name} has not resubmitted their ${REQ_LABEL[r.requirement_type]} after it was flagged 7+ days ago.`, '/Compliance');
    stats.escalated++;
  }
  return { ...stats, toEmail, season_name: season?.name || '' };
}

export const asList = <T>(r: T[] | { items?: T[] }): T[] => (Array.isArray(r) ? r : r?.items || []);
export const BODIES_LABEL: Record<string, string> = {
  us_soccer: 'US Soccer', girls_academy_league: 'Girls Academy League', mls_next: 'MLS Next',
  gotsports: 'GotSport (US Club Soccer)', us_youth_soccer: 'US Youth Soccer',
  us_club_soccer: 'US Club Soccer', michigan_youth_soccer: 'Michigan Youth Soccer (MSYSA)',
};

/** 7-days-before-season: notify non-compliant coaches and admins. Returns who was reminded. */
export async function seasonStartReminders(db: any, clubId: string) {
  const season = await getActiveSeason(db, clubId);
  if (!season?.start_date) return { sent: 0, reason: 'no start date' };
  const t = today();
  const start = season.start_date.slice(0, 10);
  if (start < t) return { sent: 0, reason: 'season already started' };
  if (start > addDays(t, 7)) return { sent: 0, reason: 'more than 7 days away' };
  const [coachesRes, recsRes] = await Promise.all([
    db.Coach.filter({ club_id: clubId, status: 'active' }, { limit: 1000 }),
    db.ComplianceRecord.filter({ club_id: clubId, season_id: season.id }, { limit: 5000 }),
  ]);
  const coaches = asList(coachesRes);
  const records = asList(recsRes);
  const reminded: any[] = [];
  for (const c of coaches) {
    const recs = records.filter((r: any) => r.coach_email?.toLowerCase() === c.email.toLowerCase());
    const missingReqs = REQUIREMENTS.filter((req) => !recs.find((r: any) => r.requirement_type === req));
    const bad = recs.filter((r: any) => ['missing', 'expired', 'flagged'].includes(r.status));
    if (!missingReqs.length && !bad.length) continue;
    const items = [...missingReqs.map(REQ_LABEL), ...bad.map((r: any) => REQ_LABEL[r.requirement_type])].filter((v, i, a) => a.indexOf(v) === i);
    reminded.push({ email: c.email, name: `${c.first_name} ${c.last_name}`.trim(), items });
    await notify(db, clubId, c.email, 'Compliance due before season starts',
      `Your ${season.name} season starts ${start}. Please complete: ${items.join(', ')}.`);
  }
  if (reminded.length) {
    for (const e of await adminEmails(db, clubId, undefined, true)) {
      await notify(db, clubId, e, 'Coaches not yet compliant',
        `${reminded.length} coach(es) are not fully compliant, with the ${season.name} season starting ${start}.`, '/Compliance');
    }
  }
  return { sent: reminded.length, season: season.name, start, reminded };
}

/** Weekly digest: per-club compliance summary for the admin email. */
export async function buildClubDigest(db: any, clubId: string) {
  const [settings, season, coachesRes, branchesRes] = await Promise.all([
    getSettings(db, clubId), getActiveSeason(db, clubId),
    db.Coach.filter({ club_id: clubId, status: 'active' }, { limit: 1000 }),
    db.Location.filter({ club_id: clubId }, { limit: 200 }),
  ]);
  const coaches = asList(coachesRes);
  const branches = asList(branchesRes);
  const bodies: string[] = settings?.governing_bodies || [];
  const records = season ? asList(await db.ComplianceRecord.filter({ club_id: clubId, season_id: season.id }, { limit: 5000 })) : [];
  const recFor = (email: string, req: string) => records.find((r: any) => r.coach_email?.toLowerCase() === email.toLowerCase() && r.requirement_type === req);
  const isOk = (email: string) => REQUIREMENTS.every((req) => { const r = recFor(email, req); return r && ['approved', 'expiring_soon'].includes(r.status); });
  const stats = { total: coaches.length, compliant: 0, pending: 0, flagged: 0, missing: 0, expired: 0 };
  for (const c of coaches) {
    if (isOk(c.email)) { stats.compliant++; continue; }
    const bg = recFor(c.email, 'background_check');
    const ss = recFor(c.email, 'safesport_certification');
    if (bg?.status === 'flagged' || ss?.status === 'flagged') stats.flagged++;
    else if (bg?.status === 'pending' || ss?.status === 'pending') stats.pending++;
    else if (bg?.status === 'expired' || ss?.status === 'expired') stats.expired++;
    else stats.missing++;
  }
  const byBranch = branches.map((b: any) => {
    const bc = coaches.filter((c: any) => c.location_id === b.id);
    return { branch: b.name, total: bc.length, compliant: bc.filter((c: any) => isOk(c.email)).length };
  });
  return { season: season?.name || 'No active season', bodies, stats, byBranch, pendingReview: records.filter((r: any) => r.status === 'pending').length };
}