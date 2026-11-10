// @ts-nocheck
// Data helpers for the review function: live lookups and the validation run.
import { fetchAll, inBatches } from '../../shared/migrationFiles.ts';
import { validateAll, carryResolutions, nextStatus, summarize, playerKey } from '../../shared/migrationValidate.ts';

const low = (x) => String(x ?? '').trim().toLowerCase();

// Everything is restricted to the project's club.
export async function loadLive(svc, clubId) {
  const [guardians, players, teams, locations] = await Promise.all([
    fetchAll(svc.entities.Guardian, { club_id: clubId }),
    fetchAll(svc.entities.Player, { club_id: clubId }),
    fetchAll(svc.entities.Team, { club_id: clubId }),
    fetchAll(svc.entities.Location, { club_id: clubId }),
  ]);
  const guardiansByEmail = new Map();
  const guardiansById = new Map();
  for (const g of guardians) {
    guardiansById.set(g.id, g);
    if (g.email && !guardiansByEmail.has(low(g.email))) guardiansByEmail.set(low(g.email), g);
  }
  const playersByKey = new Map();
  for (const p of players) {
    for (const gid of [p.guardian_id, ...(p.guardian_ids || [])].filter(Boolean)) {
      const g = guardiansById.get(gid);
      if (g?.email) playersByKey.set(playerKey(g.email, p), p);
    }
  }
  const teamsByName = new Map(teams.map((t) => [low(t.name), t]));
  const locationsByName = new Map(locations.map((l) => [low(l.name), l]));
  return {
    guardians, players, teams, locations,
    guardiansByEmail, guardiansById, playersByKey, teamsByName, locationsByName,
    locationNames: locations.map((l) => l.name),
  };
}

export async function writeIssues(svc, project, issues) {
  await svc.entities.ValidationIssue.deleteMany({ project_id: project.id, club_id: project.club_id });
  const rows = issues.map((i) => ({ ...i, project_id: project.id, club_id: project.club_id }));
  await inBatches(rows, 200, (slice) => svc.entities.ValidationIssue.bulkCreate(slice));
}

// Recomputes record statuses and the project summary from the current issues.
export async function refreshStatuses(svc, project, records, issues) {
  const blocking = new Set(issues.filter((i) => i.resolution === 'open' && i.severity !== 'info').map((i) => i.staged_record_id));
  const updates = [];
  for (const r of records) {
    const next = nextStatus(r, blocking);
    if (next !== r.status) { updates.push({ id: r.id, status: next }); r.status = next; }
  }
  await inBatches(updates, 200, (slice) => svc.entities.StagedRecord.bulkUpdate(slice));
  const summary = { ...summarize(records, issues), updated_at: new Date().toISOString() };
  await svc.entities.MigrationProject.update(project.id, { stage_summary: summary });
  return summary;
}

// Full re-validation: rules, live matches, carried-over decisions, statuses.
export async function runValidation(svc, project, recordsIn) {
  const records = recordsIn || await fetchAll(svc.entities.StagedRecord, { project_id: project.id, club_id: project.club_id });
  const live = await loadLive(svc, project.club_id);
  const { issues, matches } = validateAll(records, live);
  const old = await fetchAll(svc.entities.ValidationIssue, { project_id: project.id, club_id: project.club_id });
  const finalIssues = carryResolutions(issues, old);
  await writeIssues(svc, project, finalIssues);

  const matchUpdates = [];
  for (const r of records) {
    const want = matches.get(r.id) || '';
    if (want !== (r.matched_live_id || '')) { matchUpdates.push({ id: r.id, matched_live_id: want }); r.matched_live_id = want; }
  }
  await inBatches(matchUpdates, 200, (slice) => svc.entities.StagedRecord.bulkUpdate(slice));
  const stored = await fetchAll(svc.entities.ValidationIssue, { project_id: project.id, club_id: project.club_id });
  const summary = await refreshStatuses(svc, project, records, stored);
  return { summary, records, issues: stored };
}