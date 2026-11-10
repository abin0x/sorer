import { base44 } from "@/api/base44Client";

export const UNDO_WINDOW_DAYS = 7;
export const isLive = (t) => !["skipped", "merged", "retired"].includes(t.status);

const ageNum = (ag) => {
  const m = /U\s?(\d+)/i.exec(ag || "");
  return m ? parseInt(m[1], 10) : null;
};
export const ageUp = (ag) => (ageNum(ag) ? `U${ageNum(ag) + 1}` : ag);

export async function audit(clubId, summary, entityId, metadata = {}) {
  const me = await base44.auth.me().catch(() => null);
  await base44.entities.AuditLog.create({
    club_id: clubId, user_id: me?.id, user_email: me?.email, action: "settings_changed",
    entity_type: "Season", entity_id: entityId, metadata: { summary, ...metadata },
  }).catch(() => {});
}

/** Phase 1: create a Preparing season with draft teams aged up one group (nothing is live). */
export async function prepareNextSeason({ source, name, startDate, endDate, clubId }) {
  const existing = await base44.entities.Season.filter({ club_id: clubId, status: "preparing" });
  if (existing.length) throw new Error("A season is already being prepared. Resume it first.");
  const next = await base44.entities.Season.create({
    club_id: clubId, name, status: "preparing", is_current: false,
    start_date: startDate || undefined, end_date: endDate || undefined,
    previous_season_id: source.id, rolled_over_from_season_id: source.id,
  });
  const teams = (await base44.entities.Team.filter({ season: source.name })).filter(isLive);
  const oldest = Math.max(0, ...teams.map((t) => ageNum(t.age_group) || 0));
  const drafts = teams.map((t) => {
    const retire = oldest > 0 && ageNum(t.age_group) === oldest;
    const newAge = ageUp(t.age_group);
    return {
      club_id: t.club_id || clubId, season: name, status: retire ? "skipped" : "draft",
      rollover_decision: retire ? "skip" : "roll", rolled_from_team_id: t.id,
      notes: retire ? "Retire: oldest age group" : undefined,
      name: t.age_group && t.name.includes(t.age_group) ? t.name.replace(t.age_group, newAge) : t.name,
      age_group: newAge, gender: t.gender, playing_format: t.playing_format,
      league: t.league, platform_id: t.platform_id, platform_name: t.platform_name,
      cost: t.cost, location_id: t.location_id, location_name: t.location_name,
      // coaches carried as suggestions only
      next_season_coach_id: t.coach_id, next_season_coach_name: t.coach_name,
      max_roster_size: t.max_roster_size, player_ids: [],
    };
  });
  if (drafts.length) await base44.entities.Team.bulkCreate(drafts);
  const ages = await base44.entities.AgeGroup.filter({ season_id: source.id });
  if (ages.length) {
    await base44.entities.AgeGroup.bulkCreate(ages.map((a) => ({
      season_id: next.id, season_name: name, age_group: a.age_group, birth_date_start: a.birth_date_start,
      birth_date_end: a.birth_date_end, playing_format: a.playing_format, order: a.order,
    })));
  }
  // Age-eligible players join the new season's tryout player pool straight away,
  // so the pool is ready before tryout plans are built. Never blocks the rollover.
  const pool = await base44.functions
    .invoke("tryout-pool", { action: "sync", club_id: clubId, season_id: next.id })
    .catch((e) => { console.warn("tryout pool sync skipped:", e?.message || e); return null; });
  const pooled = pool?.data?.added;
  await audit(clubId, `Prepared season ${name} from ${source.name}${pooled ? ` · ${pooled} players added to the tryout pool` : ""}`, next.id, pooled ? { tryout_pool_added: pooled } : {});
  return next;
}

/** Apply a rollover review decision to a draft team. */
export async function setDecision(team, decision, mergeIntoId) {
  if (decision === "roll") return base44.entities.Team.update(team.id, { rollover_decision: "roll", status: "draft", merge_into_team_id: null });
  if (decision === "skip") return base44.entities.Team.update(team.id, { rollover_decision: "skip", status: "skipped" });
  if (decision === "merge") return base44.entities.Team.update(team.id, { rollover_decision: "merge", status: "merged", merge_into_team_id: mergeIntoId });
  if (decision === "split") {
    await base44.entities.Team.update(team.id, { rollover_decision: "split", status: "draft", name: `${team.name} A` });
    const { id, created_date, updated_date, created_by_id, ...copy } = team;
    return base44.entities.Team.create({ ...copy, name: `${team.name} B`, rollover_decision: "split", status: "draft", player_ids: [] });
  }
}

/** Matrix rules. Returns [{ teamId, message }] */
export function matrixIssues(teams, platforms) {
  const issues = [];
  const live = teams.filter(isLive);
  const seen = {};
  live.forEach((t) => {
    if (!t.platform_id) issues.push({ teamId: t.id, message: `${t.name}: no platform assigned` });
    else {
      const p = platforms.find((x) => x.id === t.platform_id);
      if (p?.eligible_age_groups?.length && !p.eligible_age_groups.includes(t.age_group)) {
        issues.push({ teamId: t.id, message: `${t.name}: ${p.name} does not allow ${t.age_group}` });
      }
    }
    const k = t.name.trim().toLowerCase();
    if (seen[k]) issues.push({ teamId: t.id, message: `Duplicate team name: ${t.name}` });
    seen[k] = true;
  });
  return issues;
}

export async function confirmMatrix(season, teams, clubId) {
  const live = teams.filter(isLive);
  await Promise.all(live.filter((t) => t.status === "draft").map((t) => base44.entities.Team.update(t.id, { status: "planned" })));
  await base44.entities.Season.update(season.id, { matrix_confirmed: true });
  await audit(clubId, `Confirmed matrix for ${season.name} (${live.length} teams)`, season.id);
}

/** Phase 10 pre-flight. blocking items must pass; review items need acknowledgement. */
export async function runPreflight(season, teams) {
  const live = teams.filter(isLive);
  const [pay, exp] = await Promise.all([
    base44.entities.Payment.filter({ status: "pending" }, "-created_date", 200).catch(() => []),
    base44.entities.ExpenseReport.filter({ status: "submitted" }, "-created_date", 200).catch(() => []),
  ]);
  const noRoster = live.filter((t) => !(t.player_ids || []).length);
  const noPlan = live.filter((t) => !t.team_plan_id);
  return [
    { key: "matrix", label: "Team and platform matrix confirmed", blocking: true, ok: !!season.matrix_confirmed && matrixIssues(teams, []).filter((i) => i.message.includes("no platform")).length === 0 },
    { key: "teams", label: "Next season has teams", blocking: true, ok: live.length > 0 },
    { key: "rosters", label: "Every team has players on its roster", ok: noRoster.length === 0, detail: noRoster.map((t) => t.name).join(", ") },
    { key: "plans", label: "Every team has a team plan", ok: noPlan.length === 0, detail: noPlan.map((t) => t.name).join(", ") },
    { key: "balances", label: "Old season: unpaid balances reviewed", ok: pay.length === 0, detail: `${pay.length} pending payments` },
    { key: "expenses", label: "Old season: pending expense reports reviewed", ok: exp.length === 0, detail: `${exp.length} submitted reports` },
  ];
}

export async function switchSeason({ next, current, teams, clubId }) {
  const now = new Date();
  const undoUntil = new Date(now.getTime() + UNDO_WINDOW_DAYS * 864e5).toISOString();
  const oldTeams = current ? await base44.entities.Team.filter({ season: current.name }) : [];
  if (current) await base44.entities.Season.update(current.id, { status: "archived", is_current: false });
  await base44.entities.Season.update(next.id, { status: "active", is_current: true, switch_date: now.toISOString() });
  await Promise.all(teams.filter(isLive).map((t) => base44.entities.Team.update(t.id, { status: "active" })));
  const archive = current ? await base44.entities.SeasonArchive.create({
    club_id: clubId, season_id: current.id, season_name: current.name, next_season_id: next.id,
    archived_at: now.toISOString(), undo_until: undoUntil,
    snapshot: { teams: oldTeams.length, players: oldTeams.reduce((s, t) => s + (t.player_ids || []).length, 0) },
  }) : null;
  await audit(clubId, `Season switch: ${current?.name || "none"} archived, ${next.name} active`, next.id);
  // Generate compliance records for all coaches in the new active season
  base44.functions.invoke("compliance-rules", { club_id: clubId }).catch(() => {});
  return archive;
}

export async function undoSwitch(archive, clubId) {
  if (new Date(archive.undo_until) < new Date()) throw new Error("The undo window has passed.");
  await base44.entities.Season.update(archive.season_id, { status: "active", is_current: true });
  await base44.entities.Season.update(archive.next_season_id, { status: "preparing", is_current: false });
  await base44.entities.SeasonArchive.update(archive.id, { reopened: true });
  await audit(clubId, `Reopened ${archive.season_name} (switch undone)`, archive.season_id);
}