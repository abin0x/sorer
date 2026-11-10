// Dry run, resumable commit and rollback for a migration project.
// Importing only writes Team / Guardian / Player records. Nothing here sends
// email or SMS, creates Stripe objects, or touches QuickBooks.
import { fetchAll, inBatches, HttpError } from '../../shared/migrationFiles.ts';
import { loadLive } from './data.ts';

const ORDER = ['Team', 'Guardian', 'Player'];
const CHUNK = 150;
const low = (x) => String(x ?? '').trim().toLowerCase();
const empty = (v) => v === undefined || v === null || v === '';

const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => !empty(v)));

async function existingFor(svc, project, entity, chunk) {
  const uids = chunk.map((r) => r.unique_id).filter(Boolean);
  const ids = chunk.map((r) => r.matched_live_id).filter(Boolean);
  const [byUid, byId] = await Promise.all([
    uids.length ? svc.entities[entity].filter({ club_id: project.club_id, unique_id: { $in: uids } }, 'created_date', 500) : [],
    ids.length ? svc.entities[entity].filter({ club_id: project.club_id, id: { $in: ids } }, 'created_date', 500) : [],
  ]);
  return { byUid: new Map(byUid.map((x) => [x.unique_id, x])), byId: new Map(byId.map((x) => [x.id, x])) };
}

function targetFor(r, ex) {
  if (r.match_decision !== 'create' && r.matched_live_id && ex.byId.get(r.matched_live_id)) return ex.byId.get(r.matched_live_id);
  return ex.byUid.get(r.unique_id) || null;
}

export async function dryRun(svc, project) {
  const records = await fetchAll(svc.entities.StagedRecord, { project_id: project.id, club_id: project.club_id });
  const ready = records.filter((r) => r.status === 'ready');
  const out = {};
  for (const entity of ORDER) {
    const mine = ready.filter((r) => r.entity === entity);
    let update = 0;
    await inBatches(mine, 200, async (chunk) => {
      const ex = await existingFor(svc, project, entity, chunk);
      for (const r of chunk) if (targetFor(r, ex)) update++;
    });
    out[entity] = { would_create: mine.length - update, would_update: update, total: mine.length };
  }
  return out;
}

function playerPayload(r, project, live, batchId) {
  const m = r.mapped_data;
  const emails = r.links?.guardian_emails || [];
  const guardians = emails.map((e) => live.guardiansByEmail.get(low(e))).filter(Boolean);
  const team = r.links?.team_name ? live.teamsByName.get(low(r.links.team_name)) : null;
  const loc = (r.links?.location_name && live.locationsByName.get(low(r.links.location_name))) || (team?.location_id ? { id: team.location_id, name: team.location_name } : null);
  return clean({
    ...m,
    club_id: project.club_id, unique_id: r.unique_id, season: project.season || undefined,
    guardian_id: guardians[0]?.id, guardian_ids: guardians.map((g) => g.id),
    guardian_name: guardians[0] ? `${guardians[0].first_name || ''} ${guardians[0].last_name || ''}`.trim() : undefined,
    team_id: team?.id, team_name: team?.name, age_group: team?.age_group, league: team?.league,
    coach_id: team?.coach_id, coach_name: team?.coach_name,
    location_id: loc?.id, location_name: loc?.name,
    source: 'migration', migration_batch_id: batchId,
  });
}

function basePayload(r, project, live, batchId) {
  const loc = r.links?.location_name && live.locationsByName.get(low(r.links.location_name));
  return clean({
    ...r.mapped_data,
    club_id: project.club_id, unique_id: r.unique_id, season: r.entity === 'Team' ? (project.season || undefined) : undefined,
    location_id: loc?.id, location_name: loc?.name,
    source: 'migration', migration_batch_id: batchId,
  });
}

export async function commitStep(svc, project) {
  const records = await fetchAll(svc.entities.StagedRecord, { project_id: project.id, club_id: project.club_id });
  const ready = records.filter((r) => r.status === 'ready');
  const total = ready.length;
  const done = ready.filter((r) => r.committed_id).length;

  const entity = ORDER.find((e) => ready.some((r) => r.entity === e && !r.committed_id));
  if (!entity) return finish(svc, project, ready);

  const chunk = ready.filter((r) => r.entity === entity && !r.committed_id).slice(0, CHUNK);
  const batches = await svc.entities.CommitBatch.filter({ project_id: project.id, club_id: project.club_id, entity }, 'created_date', 5);
  const batch = batches[0] || await svc.entities.CommitBatch.create({ project_id: project.id, club_id: project.club_id, entity, created_ids: [], updated: [], status: 'committing' });

  const live = await loadLive(svc, project.club_id);
  const ex = await existingFor(svc, project, entity, chunk);
  const ent = svc.entities[entity];

  const creates = [];
  const updates = [];
  const priors = [];
  const results = [];
  for (const r of chunk) {
    const payload = entity === 'Player' ? playerPayload(r, project, live, batch.id) : basePayload(r, project, live, batch.id);
    const target = targetFor(r, ex);
    if (!target) { creates.push({ r, payload }); continue; }
    if (target.migration_batch_id === batch.id && (batch.created_ids || []).includes(target.id)) { results.push({ r, id: target.id, action: 'created' }); continue; }
    const { club_id, unique_id, ...fields } = payload;
    const prior = {};
    for (const k of Object.keys(fields)) prior[k] = target[k] === undefined ? null : target[k];
    updates.push({ r, id: target.id, fields });
    priors.push({ id: target.id, prior });
  }

  if (creates.length) {
    const made = await ent.bulkCreate(creates.map((c) => c.payload));
    made.forEach((rec, i) => results.push({ r: creates[i].r, id: rec.id, action: 'created' }));
    batch.created_ids = [...(batch.created_ids || []), ...made.map((m) => m.id)];
  }
  if (updates.length) {
    await ent.bulkUpdate(updates.map((u) => ({ id: u.id, ...u.fields })));
    updates.forEach((u) => results.push({ r: u.r, id: u.id, action: 'updated' }));
    batch.updated = [...(batch.updated || []), ...priors];
  }
  await svc.entities.CommitBatch.update(batch.id, { created_ids: batch.created_ids, updated: batch.updated });
  await svc.entities.StagedRecord.bulkUpdate(results.map((x) => ({ id: x.r.id, committed_id: x.id, commit_action: x.action })));

  return { finished: false, phase: `Writing ${entity.toLowerCase()}s`, done: done + chunk.length, total };
}

// Link-resolution pass, then post-commit verification.
async function finish(svc, project, ready) {
  const batches = await fetchAll(svc.entities.CommitBatch, { project_id: project.id, club_id: project.club_id });
  const committedPlayers = ready.filter((r) => r.entity === 'Player' && r.committed_id).map((r) => r.committed_id);
  const players = [];
  await inBatches(committedPlayers, 200, async (ids) => {
    players.push(...await svc.entities.Player.filter({ club_id: project.club_id, id: { $in: ids } }, 'created_date', 500));
  });

  const byTeam = new Map();
  const byGuardian = new Map();
  for (const p of players) {
    if (p.team_id) byTeam.set(p.team_id, [...(byTeam.get(p.team_id) || []), p.id]);
    for (const g of [p.guardian_id, ...(p.guardian_ids || [])].filter(Boolean)) {
      byGuardian.set(g, [...new Set([...(byGuardian.get(g) || []), p.id])]);
    }
  }
  const merge = async (entity, map) => {
    const ids = [...map.keys()];
    await inBatches(ids, 200, async (chunk) => {
      const live = await svc.entities[entity].filter({ club_id: project.club_id, id: { $in: chunk } }, 'created_date', 500);
      await svc.entities[entity].bulkUpdate(live.map((x) => ({ id: x.id, player_ids: [...new Set([...(x.player_ids || []), ...map.get(x.id)])] })));
    });
  };
  await merge('Team', byTeam);
  await merge('Guardian', byGuardian);

  // Verification: recount live records by batch and compare to the approved numbers.
  const counts = {};
  let ok = true;
  for (const b of batches) {
    const expected = (b.created_ids || []).length + (b.updated || []).length;
    const liveCount = (await fetchAll(svc.entities[b.entity], { club_id: project.club_id, migration_batch_id: b.id })).length;
    counts[b.entity] = { expected, found: liveCount, created: (b.created_ids || []).length, updated: (b.updated || []).length };
    if (liveCount !== expected) ok = false;
    await svc.entities.CommitBatch.update(b.id, { status: 'done', completed_at: new Date().toISOString() });
  }
  return { finished: true, verified: ok, counts };
}

export async function rollback(svc, project) {
  const batches = (await fetchAll(svc.entities.CommitBatch, { project_id: project.id, club_id: project.club_id })).filter((b) => b.status !== 'rolled_back');
  if (!batches.length) throw new HttpError(409, 'Nothing to roll back');
  if (project.committed_at) {
    const deadline = new Date(project.committed_at).getTime() + (project.rollback_window_days || 14) * 86400000;
    if (Date.now() > deadline) throw new HttpError(409, `The ${project.rollback_window_days || 14}-day rollback window has passed.`);
  }
  const created = (e) => new Set(batches.filter((b) => b.entity === e).flatMap((b) => b.created_ids || []));
  const cTeams = created('Team'), cGuardians = created('Guardian'), cPlayers = created('Player');
  const since = project.committed_at ? new Date(project.committed_at).getTime() : 0;

  // Block when the rollback would destroy data created or edited after go-live.
  const live = await loadLive(svc, project.club_id);
  const reasons = [];
  const newer = live.players.filter((p) => !cPlayers.has(p.id) && ((p.team_id && cTeams.has(p.team_id)) || (p.guardian_id && cGuardians.has(p.guardian_id))));
  if (newer.length) reasons.push(`${newer.length} player(s) added after go-live belong to teams or guardians created by this import.`);
  if (since) {
    for (const [name, set, list] of [['team', cTeams, live.teams], ['guardian', cGuardians, live.guardians], ['player', cPlayers, live.players]]) {
      const edited = list.filter((x) => set.has(x.id) && new Date(x.updated_date).getTime() > since);
      if (edited.length) reasons.push(`${edited.length} imported ${name}(s) were edited after go-live.`);
    }
  }
  if (reasons.length) throw new HttpError(409, `Rollback blocked: ${reasons.join(' ')}`);

  // Restore updated records, then delete created ones (players first).
  for (const b of batches) {
    const sets = [];
    const unsets = new Map();
    for (const u of b.updated || []) {
      const set = {}, drop = [];
      for (const [k, v] of Object.entries(u.prior || {})) {
        if (v === null) drop.push(k);
        else set[k] = v;
      }
      if (Object.keys(set).length) sets.push({ id: u.id, ...set });
      if (drop.length) { const sig = drop.sort().join(','); unsets.set(sig, [...(unsets.get(sig) || []), u.id]); }
    }
    await inBatches(sets, 200, (slice) => svc.entities[b.entity].bulkUpdate(slice));
    for (const [sig, ids] of unsets) {
      const $unset = Object.fromEntries(sig.split(',').map((k) => [k, '']));
      await inBatches(ids, 200, (slice) => svc.entities[b.entity].updateMany({ club_id: project.club_id, id: { $in: slice } }, { $unset }));
    }
  }
  for (const entity of ['Player', 'Guardian', 'Team']) {
    const ids = [...created(entity)];
    await inBatches(ids, 200, (slice) => svc.entities[entity].deleteMany({ club_id: project.club_id, id: { $in: slice } }));
  }
  // Remove deleted player ids from surviving teams and guardians.
  for (const [entity, list] of [['Team', live.teams], ['Guardian', live.guardians]]) {
    const fix = list.filter((x) => !(entity === 'Team' ? cTeams : cGuardians).has(x.id) && (x.player_ids || []).some((id) => cPlayers.has(id)))
      .map((x) => ({ id: x.id, player_ids: x.player_ids.filter((id) => !cPlayers.has(id)) }));
    await inBatches(fix, 200, (slice) => svc.entities[entity].bulkUpdate(slice));
  }

  const staged = await fetchAll(svc.entities.StagedRecord, { project_id: project.id, club_id: project.club_id });
  await inBatches(staged.filter((r) => r.committed_id), 200, (slice) => svc.entities.StagedRecord.bulkUpdate(slice.map((r) => ({ id: r.id, committed_id: '', commit_action: '' }))));
  for (const b of batches) await svc.entities.CommitBatch.update(b.id, { status: 'rolled_back' });
  return { removed: { Team: cTeams.size, Guardian: cGuardians.size, Player: cPlayers.size } };
}