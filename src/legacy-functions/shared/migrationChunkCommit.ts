// @ts-nocheck
import { batchSize, transient, low, upsertChunk } from './migrationChunkIO.ts';
import { chunkPayload } from './migrationChunkPayload.ts';
import { linkChunk } from './migrationChunkLinks.ts';
const order = ['teams', 'guardians', 'players', 'links'];
const entities = { teams: 'Team', guardians: 'Guardian', players: 'Player' };
export async function commitChunk(svc, job, arrays) {
  const token = crypto.randomUUID();
  const lease = { token, until: Date.now() + 300000 };
  const lock = await svc.entities.MigrationJob.updateMany({ id: job.id, status: 'processing', $or: [{ 'commit_progress.lease.until': { $exists: false } }, { 'commit_progress.lease.until': { $lte: Date.now() } }] }, { $set: { 'commit_progress.lease': lease } });
  if (!lock.updated) return { finished: false, waiting: true, retry_after_ms: 5000 };
  let progress;
  try {
    // Reload only the small checkpoint after acquiring the conditional lease.
    const [latest] = await svc.entities.MigrationJob.filter({ id: job.id }, 'id', 1, 0, ['commit_progress']);
    progress = { ...latest.commit_progress, imported: { ...(latest.commit_progress?.imported || {}) }, last_error: null, retry_attempt: 0 };
    const size = await batchSize(svc);
    const sources = { teams: arrays.teamSource, guardians: arrays.finalGuardians, players: arrays.importablePlayers };
    if (progress.phase === 'links') progress = await linkChunk(svc, job, progress, size, arrays);
    else if (progress.phase !== 'done') {
      const phase = progress.phase || 'teams', index = progress.index || 0;
      const rows = sources[phase].slice(index, index + size);
      if (rows.length) {
        const records = await chunkPayload(svc, job, phase, rows, index);
        const legacyField = phase === 'guardians' ? 'email' : phase === 'teams' ? 'name' : null;
        await upsertChunk(svc, job, entities[phase], records, legacyField ? { [legacyField]: { $in: records.map(r => r[legacyField]) } } : null, legacyField ? r => low(r[legacyField]) : null);
      }
      progress.imported[phase] = index + rows.length;
      progress.index = index + rows.length;
      if (progress.index >= sources[phase].length) { progress.phase = order[order.indexOf(phase) + 1]; progress.index = 0; }
    }
    progress.batch_size = size;
    progress.batch_count = (latest.commit_progress?.batch_count || 0) + 1;
    progress.state = 'running';
    progress.updated_at = new Date().toISOString();
    progress.lease = null;
    const finished = progress.phase === 'done';
    const checkpoint = { commit_progress: progress, ...(finished ? { status: 'completed', imported_counts: progress.imported, completed_at: new Date().toISOString(), error_log: [] } : {}) };
    const saved = await svc.entities.MigrationJob.updateMany({ id: job.id, 'commit_progress.lease.token': token }, { $set: checkpoint });
    if (!saved.updated) throw new Error('Import checkpoint lease expired; reconcile this chunk on retry.');
    return { ...progress, finished, retry_after_ms: 2000 };
  } catch (error) {
    const retryable = transient(error), attempt = (job.commit_progress?.retry_attempt || 0) + 1;
    const delay = Math.min(60000, 2000 * 2 ** Math.min(attempt, 5));
    await svc.entities.MigrationJob.updateMany({ id: job.id, 'commit_progress.lease.token': token }, { $set: { 'commit_progress.lease': null, 'commit_progress.last_error': error.message, 'commit_progress.retry_attempt': attempt, 'commit_progress.retryable': retryable, 'commit_progress.state': 'error', 'commit_progress.updated_at': new Date().toISOString() } }).catch(e => console.error('Could not record migration error', e.message));
    return { finished: false, paused: !retryable, retryable, last_error: error.message, retry_after_ms: delay };
  }
}