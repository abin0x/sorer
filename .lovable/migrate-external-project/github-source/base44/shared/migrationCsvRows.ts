import { transformMigration } from './migrationTransform.ts';
import { mapMigrationCsv } from './migrationCsv.ts';
import { batchSize, upsertChunk } from './migrationChunkIO.ts';
import { csvChunk } from './migrationCsvStream.ts';
export function rowPayload(source, type, raw) {
  const result = transformMigration(source, type === 'members' ? [raw] : [], type === 'teams' ? [raw] : []);
  const errors = result.issues.filter(i => i.type !== 'duplicate').map(i => i.message);
  if (type === 'teams') result.teams = result.teams.map(t => ({ ...t, ...Object.fromEntries(['age_group', 'gender', 'playing_format', 'season', 'location_id', 'coach_id'].map(k => [k, raw[k] || t[k]])) }));
  return { payload: { guardians: result.guardians, players: result.players, teams: result.teams }, errors, has_errors: errors.length > 0 };
}
export async function prepareCsvJob(svc, job, files) {
  if (!['draft', 'client_review'].includes(job.status)) throw Object.assign(new Error('This migration cannot be restaged in its current status.'), { status: 409 });
  const keys = ['teams', 'members'].filter(key => files[key]?.file_uri);
  if (!keys.length) throw Object.assign(new Error('Upload a members or teams CSV first.'), { status: 422 });
  if (keys.some(key => !/\.csv$/i.test(files[key].file_name || ''))) throw Object.assign(new Error('For resumable staging, export your members and teams files as UTF-8 CSV.'), { status: 422 });
  const size = await batchSize(svc);
  const progress = { pipeline: 'csv_rows', phase: 'staging', generation: crypto.randomUUID(), file_keys: keys, file_index: 0, row_cursor: 0, byte_cursor: 0, source_processed: 0, source_total: keys.every(k => Number.isFinite(files[k].row_count)) ? keys.reduce((n,k) => n + files[k].row_count, 0) : null, batch_count: 0, batch_size: size, state: 'waiting', last_error: null, updated_at: new Date().toISOString() };
  await svc.entities.MigrationJob.updateMany({ id: job.id, status: job.status }, { $set: { files, status: 'processing', staging_data: { storage: 'csv_rows' }, preview_counts: {}, commit_progress: progress } });
  return progress;
}
export async function stageCsvChunk(svc, job, progress, size) {
  const type = progress.file_keys[progress.file_index], file = job.files[type];
  const chunk = await csvChunk(svc, file.file_uri, progress, size);
  const mapped = chunk.lines.length ? mapMigrationCsv(`${chunk.headers.replace(/[\r\n]+$/, '')}\n${chunk.lines.join('')}`, type, job.competitor_source || 'teamsnap') : [];
  const records = mapped.map((raw, index) => ({ club_id: job.club_id, job_id: job.id, generation: progress.generation, unique_id: `${job.id}:${progress.generation}:${type}:${progress.row_cursor + index}`, file_key: type, row_number: progress.row_cursor + index + 2, sequence: progress.file_index * 1000000000 + progress.row_cursor + index, raw_data: raw, excluded: false, ...rowPayload(job.competitor_source || 'teamsnap', type, raw) }));
  if (records.length) await upsertChunk(svc, job, 'MigrationCsvRow', records, null, null);
  const next = { ...progress, headers: chunk.headers, byte_cursor: chunk.byte_cursor, row_cursor: progress.row_cursor + records.length, source_processed: progress.source_processed + records.length, batch_count: progress.batch_count + (records.length ? 1 : 0), last_batch_rows: records.length };
  if (chunk.eof) {
    next.file_index++;
    next.headers = null; next.byte_cursor = 0; next.row_cursor = 0;
    if (next.file_index >= next.file_keys.length) { next.phase = 'review'; next.source_total = next.source_processed; }
  }
  return next;
}