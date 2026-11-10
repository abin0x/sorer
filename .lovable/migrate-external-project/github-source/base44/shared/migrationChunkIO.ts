export const DEFAULT_MIGRATION_BATCH_SIZE = 200;
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const low = (value) => String(value || '').trim().toLowerCase();
export function transient(error) {
  const status = Number(error?.status || error?.response?.status || 0);
  return status === 429 || status === 408 || status >= 500 || /write traffic volume|rate limit|timeout|network|fetch failed/i.test(error?.message || '');
}
export async function batchSize(svc) {
  const rows = await svc.entities.AppConfig.filter({ config_key: 'migration_batch_settings' }, 'id', 1, 0, ['config_value']);
  const size = Number(rows[0]?.config_value?.batch_size || DEFAULT_MIGRATION_BATCH_SIZE);
  return Math.max(1, Math.min(200, Number.isFinite(size) ? Math.floor(size) : DEFAULT_MIGRATION_BATCH_SIZE));
}
export async function readPages(entity, query, fields, size = DEFAULT_MIGRATION_BATCH_SIZE) {
  const records = [];
  for (let skip = 0; ; skip += size) {
    const page = await entity.filter(query, 'id', size, skip, fields);
    records.push(...page);
    if (page.length < size) return records;
  }
}
// Reconcile on every attempt, including after a timeout or a checkpoint failure.
// Never blindly repeat a bulkCreate after an ambiguous response.
export async function upsertChunk(svc, job, entity, records, legacyQuery, legacyKey) {
  if (!records.length) return;
  records = [...new Map(records.map(r => [r.unique_id, r])).values()];
  const fields = [...new Set(['id', 'unique_id', ...records.flatMap(record => Object.keys(record))])];
  const existing = await readPages(svc.entities[entity], { club_id: job.club_id, unique_id: { $in: records.map(r => r.unique_id) } }, fields);
  const legacy = legacyQuery ? await readPages(svc.entities[entity], { club_id: job.club_id, migration_batch_id: job.id, ...legacyQuery }, fields) : [];
  const byUid = new Map(existing.map(r => [r.unique_id, r]));
  const byLegacy = new Map(legacy.map(r => [legacyKey(r), r]));
  const creates = [], updates = [];
  for (const record of records) {
    const found = byUid.get(record.unique_id) || byLegacy.get(legacyKey?.(record));
    if (!found) creates.push(record);
    else if (Object.entries(record).some(([key, value]) => JSON.stringify(found[key]) !== JSON.stringify(value))) updates.push({ id: found.id, ...record });
  }
  if (creates.length) await svc.entities[entity].bulkCreate(creates);
  if (updates.length) await svc.entities[entity].bulkUpdate(updates);
  const confirmed = await readPages(svc.entities[entity], { club_id: job.club_id, unique_id: { $in: records.map(r => r.unique_id) } }, ['id', 'unique_id']);
  if (new Set(confirmed.map(r => r.unique_id)).size !== new Set(records.map(r => r.unique_id)).size) throw new Error('Batch was not fully saved. Retry to reconcile the remaining rows.');
}