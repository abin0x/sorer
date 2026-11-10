// @ts-nocheck
import { batchSize, transient } from './migrationChunkIO.ts';
import { stageCsvChunk } from './migrationCsvRows.ts';
import { liveCsvChunk } from './migrationCsvCommit.ts';
export const CSV_JOB_FIELDS = ['id', 'club_id', 'status', 'competitor_source', 'files', 'commit_progress', 'preview_counts', 'specialist_notes', 'imported_counts'];
export async function csvJob(svc, id) {
  return (await svc.entities.MigrationJob.filter({ id }, 'id', 1, 0, CSV_JOB_FIELDS))[0];
}
export async function runCsvChunk(svc, job) {
  if (job.status !== 'processing') return { job, finished: true };
  const token = crypto.randomUUID(), now = Date.now();
  const lock = await svc.entities.MigrationJob.updateMany({ id: job.id, status: 'processing', $or: [{ 'commit_progress.lease.until': { $exists: false } }, { 'commit_progress.lease.until': { $lte: now } }] }, { $set: { 'commit_progress.lease': { token, until: now + 300000 }, 'commit_progress.state': 'running', 'commit_progress.updated_at': new Date().toISOString() } });
  if (!lock.updated) return { job: await csvJob(svc, job.id), waiting: true, retry_after_ms: 5000 };
  let current = job;
  try {
    current = await csvJob(svc, job.id);
    const size = await batchSize(svc);
    const p = current.commit_progress;
    const next = p.phase === 'staging' ? await stageCsvChunk(svc, current, p, size) : await liveCsvChunk(svc, current, p, size);
    Object.assign(next, { lease: null, state: next.phase === 'done' ? 'completed' : next.phase === 'review' ? 'review' : 'running', last_error: null, retryable: false, retry_attempt: 0, updated_at: new Date().toISOString(), batch_size: size });
    const status = next.phase === 'done' ? 'completed' : next.phase === 'review' ? 'client_review' : 'processing';
    const saved = await svc.entities.MigrationJob.updateMany({ id: job.id, 'commit_progress.lease.token': token }, { $set: { status, commit_progress: next, ...(status === 'completed' ? { imported_counts: next.imported, completed_at: new Date().toISOString() } : {}) } });
    if (!saved.updated) throw new Error('Checkpoint lease expired. Retry to reconcile the saved chunk.');
    return { job: await csvJob(svc, job.id), finished: status !== 'processing', retry_after_ms: 2000 };
  } catch (error) {
    const retryable = transient(error), attempt = (current.commit_progress?.retry_attempt || 0) + 1;
    const delay = Math.min(60000, 2000 * 2 ** Math.min(attempt, 5));
    await svc.entities.MigrationJob.updateMany({ id: job.id, 'commit_progress.lease.token': token }, { $set: { 'commit_progress.lease': null, 'commit_progress.state': 'error', 'commit_progress.last_error': error.message, 'commit_progress.retryable': retryable, 'commit_progress.retry_attempt': attempt, 'commit_progress.retry_at': new Date(Date.now() + delay).toISOString(), 'commit_progress.updated_at': new Date().toISOString() } }).catch(e => console.error('CSV checkpoint error recording failed', e.message));
    return { job: await csvJob(svc, job.id), last_error: error.message, paused: !retryable, retryable, retry_after_ms: delay };
  }
}