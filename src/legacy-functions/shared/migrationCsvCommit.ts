// @ts-nocheck
import { low, readPages, upsertChunk, sleep } from './migrationChunkIO.ts';
import { chunkPayload } from './migrationChunkPayload.ts';
const kinds = { teams: 'Team', guardians: 'Guardian', players: 'Player' };
export async function liveCsvChunk(svc, job, progress, size) {
  const scope = { club_id: job.club_id, job_id: job.id, generation: progress.generation };
  if (progress.phase === 'verify') {
    const entity = ['Team', 'Guardian', 'Player'][progress.verify_entity || 0];
    const page = await svc.entities[entity].filter({ club_id: job.club_id, migration_batch_id: job.id }, 'id', size, progress.verify_cursor || 0, ['id']);
    const key = Object.keys(kinds).find(k => kinds[k] === entity);
    const counts = { ...(progress.imported || {}), [key]: (progress.imported?.[key] || 0) + page.length };
    const next = { ...progress, imported: counts, verify_cursor: (progress.verify_cursor || 0) + page.length };
    if (page.length < size) { next.verify_entity = (progress.verify_entity || 0) + 1; next.verify_cursor = 0; if (next.verify_entity === 3) next.phase = 'done'; }
    return next;
  }
  const rows = await svc.entities.MigrationCsvRow.filter(scope, 'sequence', size, progress.commit_cursor || 0, ['id', 'payload', 'excluded', 'has_errors']);
  const usable = rows.filter(r => !r.excluded);
  if (usable.some(r => r.has_errors)) throw Object.assign(new Error('An approved row still has validation issues. Correct or exclude it before continuing.'), { status: 422 });
  let writes = 0;
  for (const phase of ['teams', 'guardians', 'players']) {
    const entries = new Map();
    for (const row of usable) for (const record of row.payload[phase] || []) {
      const key = phase === 'guardians' ? low(record.email) : phase === 'teams' ? low(record.name) : record.unique_id || `${low(record.first_name)}|${low(record.last_name)}|${record.date_of_birth}`;
      const unique_id = `csv:${job.competitor_source || 'other'}:${phase}:${key}`;
      const previous = entries.get(unique_id) || {};
      entries.set(unique_id, { ...previous, ...Object.fromEntries(Object.entries(record).filter(([,v]) => v !== '' && v != null)), unique_id });
    }
    const list = [...entries.values()];
    for (let offset = 0; offset < list.length; offset += size) {
      const records = await chunkPayload(svc, job, phase, list.slice(offset, offset + size), 0);
      await upsertChunk(svc, job, kinds[phase], records, null, null);
      if (++writes % 3 === 0) await sleep(1000);
    }
  }
  await linkCsvRows(svc, job, usable, size);
  const next = { ...progress, commit_cursor: (progress.commit_cursor || 0) + rows.length, batch_count: progress.batch_count + (rows.length ? 1 : 0), last_batch_rows: rows.length };
  if (rows.length < size || next.commit_cursor >= progress.source_total) { next.phase = 'verify'; next.imported = { teams: 0, guardians: 0, players: 0 }; next.verify_entity = 0; next.verify_cursor = 0; }
  return next;
}
async function linkCsvRows(svc, job, rows, size) {
  const sourcePlayers = rows.flatMap(r => r.payload.players || []);
  const keys = sourcePlayers.map(p => `csv:${job.competitor_source || 'other'}:players:${p.unique_id || `${low(p.first_name)}|${low(p.last_name)}|${p.date_of_birth}`}`);
  if (!keys.length) return;
  const players = await readPages(svc.entities.Player, { club_id: job.club_id, unique_id: { $in: keys } }, ['id', 'guardian_id', 'team_id']);
  for (const [entity, field] of [['Team', 'team_id'], ['Guardian', 'guardian_id']]) {
    const ids = [...new Set(players.map(p => p[field]).filter(Boolean))];
    if (!ids.length) continue;
    const owners = await readPages(svc.entities[entity], { club_id: job.club_id, id: { $in: ids } }, ['id', 'player_ids']);
    const adds = new Map();
    for (const player of players) adds.set(player[field], [...(adds.get(player[field]) || []), player.id]);
    const updates = owners.map(o => ({ id: o.id, player_ids: [...new Set([...(o.player_ids || []), ...(adds.get(o.id) || [])])] }));
    for (let i = 0; i < updates.length; i += size) await svc.entities[entity].bulkUpdate(updates.slice(i, i + size));
  }
}