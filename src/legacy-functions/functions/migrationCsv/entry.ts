// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { canManageMigrationClub, isMigrationReviewer } from '../../shared/migrationAccess.ts';
import { csvJob, runCsvChunk } from '../../shared/migrationCsvRunner.ts';
import { rowPayload } from '../../shared/migrationCsvRows.ts';
import { batchSize } from '../../shared/migrationChunkIO.ts';
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req), user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const svc = base44.asServiceRole, body = await req.json(), reviewer = isMigrationReviewer(user);
    if (['get_settings', 'save_settings'].includes(body.action)) {
      if (!reviewer) return Response.json({ error: 'Only migration experts can configure batch sizes.' }, { status: 403 });
      if (body.action === 'save_settings') {
        const size = Number(body.batch_size);
        if (!Number.isInteger(size) || size < 1 || size > 200) return Response.json({ error: 'Choose a batch size between 1 and 200.' }, { status: 422 });
        const rows = await svc.entities.AppConfig.filter({ config_key: 'migration_batch_settings' }, 'id', 1, 0, ['id']);
        const config_value = { batch_size: size };
        if (rows.length) await svc.entities.AppConfig.bulkUpdate([{ id: rows[0].id, config_value }]);
        else await svc.entities.AppConfig.bulkCreate([{ config_key: 'migration_batch_settings', config_value }]);
      }
      return Response.json({ batch_size: await batchSize(svc) });
    }
    const job = await csvJob(svc, String(body.migrationJobId || ''));
    if (!job) return Response.json({ error: 'Migration not found.' }, { status: 404 });
    if (!reviewer && !await canManageMigrationClub(svc, user, job.club_id)) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (job.commit_progress?.pipeline !== 'csv_rows') return Response.json({ error: 'This job uses the legacy import runner.' }, { status: 409 });
    const scope = { job_id: job.id, club_id: job.club_id, generation: job.commit_progress.generation };
    switch (body.action) {
      case 'progress': return Response.json({ job });
      case 'chunk': {
        if (job.commit_progress.phase !== 'staging' && !reviewer) return Response.json({ error: 'Only migration experts can import approved rows.' }, { status: 403 });
        return Response.json(await runCsvChunk(svc, job));
      }
      case 'rows': {
        const skip = Math.max(0, Math.floor(Number(body.skip) || 0)), limit = Math.min(50, Math.max(1, Math.floor(Number(body.limit) || 50)));
        const query = { ...scope, ...(body.issues_only ? { has_errors: true, excluded: false } : {}) };
        const rows = await svc.entities.MigrationCsvRow.filter(query, 'sequence', limit, skip, ['id', 'file_key', 'row_number', 'raw_data', 'errors', 'excluded']);
        const more = await svc.entities.MigrationCsvRow.filter(query, 'sequence', 1, skip + rows.length, ['id']);
        return Response.json({ rows, has_more: more.length > 0 });
      }
      case 'edit_row': {
        if (!['client_review', 'support_review', 'needs_fixes'].includes(job.status)) return Response.json({ error: 'Pause for review before editing staged rows.' }, { status: 409 });
        const [row] = await svc.entities.MigrationCsvRow.filter({ ...scope, id: String(body.row_id || '') }, 'id', 1, 0, ['id', 'file_key', 'raw_data']);
        if (!row) return Response.json({ error: 'Staged row not found.' }, { status: 404 });
        const raw = body.raw_data || row.raw_data;
        if (JSON.stringify(raw).length > 65536) return Response.json({ error: 'This row is too large.' }, { status: 422 });
        await svc.entities.MigrationCsvRow.bulkUpdate([{ id: row.id, raw_data: raw, ...rowPayload(job.competitor_source || 'teamsnap', row.file_key, raw), ...(typeof body.excluded === 'boolean' ? { excluded: body.excluded } : {}) }]);
        return Response.json({ ok: true });
      }
      case 'submit': {
        if (!['client_review', 'needs_fixes'].includes(job.status)) return Response.json({ error: 'This job is not ready to submit.' }, { status: 409 });
        await svc.entities.MigrationJob.updateMany({ id: job.id, status: job.status }, { $set: { status: 'support_review', client_submitted_at: new Date().toISOString() } });
        return Response.json({ job: await csvJob(svc, job.id) });
      }
      case 'approve': {
        if (!reviewer) return Response.json({ error: 'Only migration experts can approve.' }, { status: 403 });
        if (!['client_review', 'support_review'].includes(job.status)) return Response.json({ error: 'Migration is not awaiting review.' }, { status: 409 });
        const problems = await svc.entities.MigrationCsvRow.filter({ ...scope, has_errors: true, excluded: false }, 'sequence', 1, 0, ['row_number']);
        if (problems.length) return Response.json({ error: `Correct or exclude the issues first (starting at CSV row ${problems[0].row_number}).` }, { status: 422 });
        await svc.entities.MigrationJob.updateMany({ id: job.id, status: job.status }, { $set: { status: 'processing', specialist_notes: String(body.notes || ''), reviewed_by_user_id: user.id, reviewed_at: new Date().toISOString(), commit_progress: { ...job.commit_progress, phase: 'importing', commit_cursor: 0, batch_count: 0, state: 'waiting', last_error: null } } });
        return Response.json({ job: await csvJob(svc, job.id) });
      }
      case 'send_back': {
        if (!reviewer || !['client_review', 'support_review'].includes(job.status)) return Response.json({ error: 'Cannot return this migration in its current state.' }, { status: 403 });
        await svc.entities.MigrationJob.updateMany({ id: job.id }, { $set: { status: 'needs_fixes', specialist_notes: String(body.notes || '') } });
        return Response.json({ job: await csvJob(svc, job.id) });
      }
      default: return Response.json({ error: 'Unknown migration action.' }, { status: 400 });
    }
  } catch (error) {
    console.error('migrationCsv', error.message);
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}