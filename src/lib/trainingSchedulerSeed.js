// Helpers that seed the Training Scheduler wizard's team_prefs from either
// an imported Google Sheets / xlsx training grid (via the existing
// gridImport stageGrid parser) or a previous week's Bookings.

function norm(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function buildTeamPrefs(byTeam, teams, coaches) {
  const teamByName = {};
  teams.forEach((t) => { teamByName[norm(t.name)] = t; });
  const coachByName = {};
  coaches.forEach((c) => { coachByName[norm(`${c.first_name} ${c.last_name}`)] = c; });

  const team_prefs = {};
  let matched = 0;
  const unmatchedNames = [];

  for (const [key, rows] of Object.entries(byTeam)) {
    const team = teamByName[key];
    if (!team) { unmatchedNames.push(key); continue; }
    const days = [...new Set(rows.map((r) => r.day).filter(Boolean))];
    const sessions = rows.length;
    const len = rows[0].end_min && rows[0].start_min ? rows[0].end_min - rows[0].start_min : 90;
    const coachIds = [];
    rows.forEach((r) => {
      if (!r.coach) return;
      const cid = coachByName[norm(r.coach)]?.id;
      if (cid) coachIds.push(cid);
    });
    const uniqueCoachIds = [...new Set(coachIds)];
    team_prefs[team.id] = {
      sessions_per_week: Math.min(sessions, 7),
      session_length_min: len > 0 ? len : 90,
      preferred_days: days,
      coach_ids: uniqueCoachIds.length
        ? uniqueCoachIds
        : (team.coach_ids?.length ? team.coach_ids : team.coach_id ? [team.coach_id] : []),
    };
    matched++;
  }
  return { team_prefs, matched, unmatched: unmatchedNames.length, unmatchedNames };
}

/**
 * Seed from staged bookings produced by gridImport.stageGrid().
 * Staged booking shape: { team, day, start, end, coach, event_type, ... }
 * Only practice/training rows count toward team training preferences.
 */
export function seedFromStagedBookings(stagedBookings, teams, coaches) {
  const byTeam = {};
  stagedBookings.forEach((b) => {
    if (!["practice", "training"].includes(b.event_type)) return;
    const key = norm(b.team);
    if (!key) return;
    if (!byTeam[key]) byTeam[key] = [];
    byTeam[key].push({ team: key, day: b.day, start_min: b.start, end_min: b.end, coach: b.coach || "" });
  });
  return buildTeamPrefs(byTeam, teams, coaches);
}

/** Seed from a previous week's Booking entity records. */
export function seedFromBookings(bookings, teams, coaches) {
  const byTeam = {};
  bookings.forEach((b) => {
    const key = norm(b.team_name);
    if (!key) return;
    if (!byTeam[key]) byTeam[key] = [];
    byTeam[key].push({ team: key, day: b.day, start_min: b.start_min, end_min: b.end_min, coach: b.coach_name || "" });
  });
  return buildTeamPrefs(byTeam, teams, coaches);
}