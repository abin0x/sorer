// @ts-nocheck
// Stage 3 (Auto-Map): pulls the club's uploaded export files, extracts raw
// rows (CSV via deterministic header matching, Excel via AI extractor), runs
// them through the source-specific migration template (cleaning, validation,
// dedup, duplicate detection, issue categorization), and hands the job to
// the CLIENT for review — not straight to a specialist.
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { getTemplate } from '../../shared/migrationTemplates.ts';
import { transformMigration } from '../../shared/migrationTransform.ts';
import { mapMigrationCsv } from '../../shared/migrationCsv.ts';
import { canManageMigrationClub, isMigrationReviewer } from '../../shared/migrationAccess.ts';
import { prepareCsvJob } from '../../shared/migrationCsvRows.ts';

export default async function (req) {
  let svc, migrationJobId;
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    migrationJobId = body.migrationJobId;
    const { files: filesPayload, validationOnly = false } = body;
    if (!migrationJobId) return Response.json({ error: 'migrationJobId is required' }, { status: 400 });

    svc = base44.asServiceRole;
    const job = await svc.entities.MigrationJob.get(migrationJobId);
    if (!job) return Response.json({ error: 'Migration job not found' }, { status: 404 });

    if (!isMigrationReviewer(user) && !await canManageMigrationClub(svc, user, job.club_id)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const files = filesPayload && typeof filesPayload === 'object' ? filesPayload : (job.files || {});
    const sourceFiles = ['members', 'teams'].filter(key => files[key]?.file_uri);
    if (sourceFiles.length && sourceFiles.every(key => /\.csv$/i.test(files[key].file_name || ''))) {
      if (validationOnly) return Response.json({ resumable: true, message: 'CSV validation runs in resumable chunks.' });
      const progress = await prepareCsvJob(svc, job, files);
      return Response.json({ started: true, resumable: true, progress });
    }
    if (filesPayload && !validationOnly) {
      await svc.entities.MigrationJob.update(migrationJobId, { files });
    }
    if (!validationOnly) await svc.entities.MigrationJob.update(migrationJobId, { status: 'processing' });

    // Pick the template based on the job's competitor_source.
    const template = getTemplate(job.competitor_source || 'teamsnap');

    const rawMembers: any[] = [];
    const rawTeams: any[] = [];
    const warnings: string[] = [];

    const extractFile = async (key: string, schema: any): Promise<any[]> => {
      const fileInfo = files[key];
      if (!fileInfo || !fileInfo.file_uri) return [];
      try {
        const signed = await svc.integrations.Core.CreateFileSignedUrl({ file_uri: fileInfo.file_uri, expires_in: 600 });
        if (/\.csv$/i.test(fileInfo.file_name || '')) {
          const response = await fetch(signed.signed_url, { signal: AbortSignal.timeout(30000) });
          if (!response.ok) throw new Error(`Could not download the uploaded file (${response.status}). Upload it again.`);
          return mapMigrationCsv(await response.text(), key, job.competitor_source || 'teamsnap');
        }
        const extracted = await svc.integrations.Core.ExtractDataFromUploadedFile({
          file_url: signed.signed_url,
          json_schema: schema,
        });
        if (extracted?.status === 'success') {
          const out = extracted.output;
          return Array.isArray(out?.records) ? out.records : Array.isArray(out) ? out : [];
        }
        warnings.push(`We couldn't fully read your ${key} file: ${extracted?.details || 'unrecognized format'}.`);
        return [];
      } catch (e: any) {
        console.error(`Migration ${key} mapping failed`, e.message);
        warnings.push(`${fileInfo.file_name || key}: ${e.message}`);
        return [];
      }
    };

    rawMembers.push(...await extractFile('members', template.schemas.members));
    rawTeams.push(...await extractFile('teams', template.schemas.teams));
    for (const key of ['events', 'payments']) {
      if (files[key]?.file_uri) warnings.push(`${files[key].file_name || key}: retained for specialist review; automatic ${key} import is not supported yet.`);
    }

    // Run the source-specific transform — produces structured staging data
    // with categorized issues and duplicate groups.
    const result = transformMigration(job.competitor_source || 'teamsnap', rawMembers, rawTeams);

    const preview_counts = {
      guardians: result.guardians.length,
      players: result.players.length,
      teams: result.teams.length,
      exceptions: result.exceptions.length,
      issues: result.issues.length,
      duplicates: result.duplicates.length,
      client_fixable: result.issues.filter((i) => i.category === 'client_fixable').length,
      needs_human_review: result.issues.filter((i) => i.category === 'needs_human_review').length,
    };

    if (validationOnly) return Response.json({ preview_counts, warnings, source_rows: rawMembers.length });

    // Route to client_review — the club fixes what they can before a human sees it.
    await svc.entities.MigrationJob.update(migrationJobId, {
      staging_data: {
        guardians: result.guardians,
        players: result.players,
        teams: result.teams,
        exceptions: result.exceptions,
        issues: result.issues,
        duplicates: result.duplicates,
        decisions: template.decisions,
        team_sheet_needed: result.team_sheet_needed,
        decisions_needed: result.decisions_needed,
      },
      preview_counts,
      warnings,
      status: 'client_review',
      submitted_at: new Date().toISOString(),
    });

    return Response.json({ preview_counts, warnings });
  } catch (error) {
    console.error('migration-process-files error', error);
    // Reset the job back to draft so the user isn't stuck in "processing" forever,
    // and store the error so the UI can show what went wrong.
    if (svc && migrationJobId) {
      try {
        const current = await svc.entities.MigrationJob.get(migrationJobId);
        if (current.status === 'processing') {
          await svc.entities.MigrationJob.update(migrationJobId, {
            status: 'draft',
            error_log: [...(current.error_log || []), `Processing failed: ${error.message}`],
          });
        }
      } catch (resetErr) {
        console.error('Failed to reset stuck migration job', resetErr.message);
      }
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
}