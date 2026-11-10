// @ts-nocheck
// Stage 4 sign-off + Stage 5/6 (Migrate & Go Live): a support/system reviewer
// approves the staged data, which is then imported into production entities
// in resumable batches to avoid gateway timeouts on large data sets.
//
// Actions:
//   approve     — record the specialist sign-off, set status to "processing",
//                 initialize commit_progress, and return immediately. The
//                 frontend then polls commit_step until finished.
//   commit_step  — process the next batch (25 records) of the current phase
//                 (teams → guardians → players → links → done), persist
//                 progress, and return the current state. Each call is short
//                 enough to stay well under the gateway timeout.
//   send_back   — return the job to the club with a note (status "needs_fixes").
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { applyDuplicateDecisions } from '../../shared/migrationTransform.ts';
import { syncDuplicateIssues, markIssue, recordReview, resolveRecordIssues } from '../../shared/migrationReviewState.ts';
import { applyRecordAction, fixException, fixMissingGuardian } from '../../shared/migrationRecordActions.ts';
import { parseDate, normalizeEmail, normalizeGender } from '../../shared/migrationCleaning.ts';
import { commitChunk } from '../../shared/migrationChunkCommit.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isReviewer =
      user.role === 'admin' ||
      user.is_super_admin === true ||
      ['system_owner', 'system_admin', 'system_support'].includes(user.system_role);
    if (!isReviewer) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { migrationJobId, action, specialistNotes } = body;
    if (!migrationJobId) return Response.json({ error: 'migrationJobId is required' }, { status: 400 });
    const VALID_ACTIONS = ['approve', 'commit_step', 'send_back', 'get_files', 'get_job', 'get_progress', 'fix_record', 'exclude_record', 'restore_record', 'delete_record', 'add_record', 'resolve_issue', 'bulk_resolve_issues', 'resolve_duplicate', 'bulk_resolve_duplicates', 'reprocess', 'replace_file', 'bulk_records', 'fix_exception', 'fix_missing_guardian'];
    if (!VALID_ACTIONS.includes(action)) {
      return Response.json({ error: `action must be one of: ${VALID_ACTIONS.join(', ')}` }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    const job = action === 'get_progress'
      ? (await svc.entities.MigrationJob.filter({ id: migrationJobId }, 'id', 1, 0, ['id', 'club_id', 'status', 'commit_progress', 'imported_counts']))[0]
      : await svc.entities.MigrationJob.get(migrationJobId);
    if (!job) return Response.json({ error: 'Migration job not found' }, { status: 404 });

    if (action === 'get_progress') return Response.json({ status: job.status, progress: job.commit_progress || {} });
    syncDuplicateIssues(job.staging_data || {}, job.duplicate_decisions || {});
    const specialistName = user.full_name || user.email;

    // ---- get_files: return signed URLs for uploaded files ----
    if (action === 'get_files') {
      const files = job.files || {};
      const out = [];
      for (const [key, info] of Object.entries(files)) {
        if (!info?.file_uri) continue;
        try {
          const { signed_url } = await svc.integrations.Core.CreateFileSignedUrl({ file_uri: info.file_uri, expires_in: 600 });
          out.push({ key, file_name: info.file_name || key, signed_url, size: info.size });
        } catch (e) { out.push({ key, file_name: info.file_name || key, error: e.message }); }
      }
      return Response.json({ files: out });
    }

    // ---- get_job: return the full updated job (for efficient refresh after fixes) ----
    if (action === 'get_job') {
      return Response.json({ job });
    }

    // ---- replace_file: upload a corrected source file ----
    if (action === 'replace_file') {
      if (!['support_review', 'client_review', 'needs_fixes'].includes(job.status))
        return Response.json({ error: `Job is "${job.status}", not editable` }, { status: 400 });
      const { file_key, file_uri, file_name } = body;
      if (!file_key || !file_uri) return Response.json({ error: 'file_key and file_uri are required' }, { status: 400 });
      const files = { ...(job.files || {}) };
      files[file_key] = { file_uri, file_name: file_name || file_key, replaced_at: new Date().toISOString() };
      await svc.entities.MigrationJob.update(migrationJobId, { files });
      return Response.json({ ok: true, files });
    }

    if (action === 'bulk_records' || action === 'fix_exception' || action === 'fix_missing_guardian') {
      if (!['support_review', 'client_review', 'needs_fixes'].includes(job.status)) return Response.json({ error: 'Job is not editable' }, { status: 400 });
      const update = action === 'bulk_records' ? applyRecordAction(job, body, user) : action === 'fix_exception' ? fixException(job, body, user) : fixMissingGuardian(job, body, user);
      await svc.entities.MigrationJob.update(migrationJobId, update);
      return Response.json({ ok: true });
    }

    // ---- fix_record: edit a field on a staged guardian/player/team ----
    if (action === 'fix_record') {
      if (!['support_review', 'client_review', 'needs_fixes'].includes(job.status))
        return Response.json({ error: `Job is "${job.status}", not editable` }, { status: 400 });
      const { entity, index, field, value } = body;
      if (!['guardians', 'players', 'teams'].includes(entity) || !Number.isInteger(index) || typeof field !== 'string' || field.startsWith('_') || ['__proto__', 'constructor', 'prototype'].includes(field))
        return Response.json({ error: 'Invalid record or field' }, { status: 400 });
      const staging = JSON.parse(JSON.stringify(job.staging_data || {}));
      const arr = entity === 'teams' && job.team_sheet?.length ? job.team_sheet : (staging[entity] || []);
      if (index < 0 || index >= arr.length) return Response.json({ error: 'Record not found' }, { status: 404 });
      let corrected = value;
      if (field === 'date_of_birth' && value) { const date = parseDate(String(value)); if (!date.ok) return Response.json({ error: date.note }, { status: 400 }); corrected = date.value; }
      if (['email', 'guardian_email'].includes(field) && value) { const email = normalizeEmail(String(value)); if (!email.ok || !email.value) return Response.json({ error: 'A valid email is required' }, { status: 400 }); corrected = email.value; }
      if (field === 'gender' && value) corrected = normalizeGender(String(value));
      if (field === 'is_team_parent') corrected = value === true || ['yes', 'true', '1'].includes(String(value).toLowerCase());
      const before = arr[index][field];
      arr[index][field] = corrected;
      recordReview(staging, entity, arr[index], `Edited ${field}: ${String(before ?? '')} → ${String(value ?? '')}`, user);
      if (String(value ?? '').trim()) resolveRecordIssues(staging, entity, arr[index], user, `Edited ${field}`, field);
      if (Number.isInteger(body.issue_index)) {
        const issue = staging.issues?.[body.issue_index];
        if (!issue || issue.row_ref !== `row-${arr[index]._source_row}`) return Response.json({ error: 'Issue does not belong to this row' }, { status: 400 });
        if (String(value ?? '').trim()) markIssue(issue, 'resolved', user, `Edited ${entity}.${field}`);
      }
      await svc.entities.MigrationJob.update(migrationJobId, { staging_data: staging, ...(entity === 'teams' && job.team_sheet?.length ? { team_sheet: arr } : {}) });
      return Response.json({ ok: true, record: arr[index] });
    }

    // ---- exclude_record / restore_record / delete_record ----
    if (action === 'exclude_record' || action === 'restore_record' || action === 'delete_record') {
      if (!['support_review', 'client_review', 'needs_fixes'].includes(job.status))
        return Response.json({ error: `Job is "${job.status}", not editable` }, { status: 400 });
      const { entity, index } = body;
      const staging = JSON.parse(JSON.stringify(job.staging_data || {}));
      const key = entity === 'guardians' ? 'guardians' : entity === 'players' ? 'players' : 'teams';
      if (!['guardians', 'players', 'teams'].includes(entity) || !Number.isInteger(index)) return Response.json({ error: 'Invalid record' }, { status: 400 });
      const arr = key === 'teams' && job.team_sheet?.length ? job.team_sheet : (staging[key] || []);
      if (index < 0 || index >= arr.length) return Response.json({ error: 'Record not found' }, { status: 404 });
      arr[index]._excluded = action !== 'restore_record';
      arr[index]._deleted = action === 'delete_record';
      recordReview(staging, key, arr[index], action === 'delete_record' ? 'Deleted from import' : action === 'exclude_record' ? 'Skipped from import' : 'Restored', user);
      if (action !== 'restore_record') resolveRecordIssues(staging, key, arr[index], user, arr[index]._review_method);
      await svc.entities.MigrationJob.update(migrationJobId, { staging_data: staging, ...(key === 'teams' && job.team_sheet?.length ? { team_sheet: arr } : {}) });
      return Response.json({ ok: true });
    }

    // ---- add_record: paste a new record into staging_data ----
    if (action === 'add_record') {
      if (!['support_review', 'client_review', 'needs_fixes'].includes(job.status))
        return Response.json({ error: `Job is "${job.status}", not editable` }, { status: 400 });
      const { entity, record } = body;
      const staging = JSON.parse(JSON.stringify(job.staging_data || {}));
      const key = entity === 'guardians' ? 'guardians' : entity === 'players' ? 'players' : 'teams';
      if (!staging[key]) staging[key] = [];
      staging[key].push({ ...record, _source_row: -1, _issues: [], _added_by_specialist: true });
      await svc.entities.MigrationJob.update(migrationJobId, { staging_data: staging });
      return Response.json({ ok: true, index: staging[key].length - 1 });
    }

    // ---- resolve_issue: mark an issue as resolved/accepted ----
    if (action === 'resolve_issue') {
      if (!['support_review', 'client_review', 'needs_fixes'].includes(job.status))
        return Response.json({ error: `Job is "${job.status}", not editable` }, { status: 400 });
      const { issue_index, resolution } = body;
      const staging = JSON.parse(JSON.stringify(job.staging_data || {}));
      const issues = staging.issues || [];
      if (issue_index < 0 || issue_index >= issues.length) return Response.json({ error: 'Issue not found' }, { status: 404 });
      if (!['resolved', 'accepted', 'ignored', 'excluded'].includes(resolution || 'resolved')) return Response.json({ error: 'Invalid resolution' }, { status: 400 });
      markIssue(issues[issue_index], resolution || 'resolved', user);
      await svc.entities.MigrationJob.update(migrationJobId, { staging_data: staging });
      return Response.json({ ok: true });
    }

    // ---- bulk_resolve_issues: resolve many issues at once ----
    if (action === 'bulk_resolve_issues') {
      if (!['support_review', 'client_review', 'needs_fixes'].includes(job.status))
        return Response.json({ error: `Job is "${job.status}", not editable` }, { status: 400 });
      const { resolution, category, field } = body;
      const staging = JSON.parse(JSON.stringify(job.staging_data || {}));
      const issues = staging.issues || [];
      let count = 0;
      for (const iss of issues) {
        if (iss._resolution && iss._resolution !== 'open') continue; // skip already resolved
        const matchCat = !category || iss.category === category;
        if (iss.type === 'duplicate') continue;
        const matchField = !field || (iss.field || 'general') === field;
        if (matchCat && matchField) {
          markIssue(iss, resolution || 'resolved', user);
          count++;
        }
      }
      await svc.entities.MigrationJob.update(migrationJobId, { staging_data: staging });
      return Response.json({ ok: true, resolved: count });
    }

    // ---- resolve_duplicate: set a duplicate group decision ----
    if (action === 'resolve_duplicate') {
      if (!['support_review', 'client_review', 'needs_fixes'].includes(job.status))
        return Response.json({ error: `Job is "${job.status}", not editable` }, { status: 400 });
      const { duplicate_id, decision } = body;
      if (!['merge', 'skip', 'delete'].includes(decision))
        return Response.json({ error: 'Decision must be merge, skip, or delete' }, { status: 400 });
      const dupDecisions = { ...(job.duplicate_decisions || {}) };
      if (!(job.staging_data?.duplicates || []).some((d) => d.id === duplicate_id)) return Response.json({ error: 'Duplicate not found' }, { status: 404 });
      dupDecisions[duplicate_id] = decision;
      const staging = syncDuplicateIssues(job.staging_data || {}, dupDecisions);
      for (const issue of staging.issues || []) if (issue.duplicate_id === duplicate_id) markIssue(issue, decision, user, `Duplicate: ${decision}`);
      await svc.entities.MigrationJob.update(migrationJobId, { duplicate_decisions: dupDecisions, staging_data: staging });
      return Response.json({ ok: true });
    }

    // ---- bulk_resolve_duplicates: set the same decision on all duplicate groups ----
    if (action === 'bulk_resolve_duplicates') {
      if (!['support_review', 'client_review', 'needs_fixes'].includes(job.status))
        return Response.json({ error: `Job is "${job.status}", not editable` }, { status: 400 });
      const { decision } = body;
      if (!['merge', 'skip', 'delete'].includes(decision))
        return Response.json({ error: 'Decision must be merge, skip, or delete' }, { status: 400 });
      const dupDecisions = { ...(job.duplicate_decisions || {}) };
      const dups = (job.staging_data?.duplicates) || [];
      const selected = Array.isArray(body.duplicate_ids) ? new Set(body.duplicate_ids) : null;
      const changed = new Set();
      for (const dup of dups) {
        if (!dupDecisions[dup.id] && (!selected || selected.has(dup.id))) { dupDecisions[dup.id] = decision; changed.add(dup.id); }
      }
      const staging = syncDuplicateIssues(job.staging_data || {}, dupDecisions);
      for (const issue of staging.issues || []) if (changed.has(issue.duplicate_id)) markIssue(issue, decision, user, `Duplicate: ${decision}`);
      await svc.entities.MigrationJob.update(migrationJobId, { duplicate_decisions: dupDecisions, staging_data: staging });
      return Response.json({ ok: true, count: dups.length });
    }

    // ---- reprocess: re-derive preview counts after fixes ----
    if (action === 'reprocess') {
      const staging = job.staging_data || {};
      const guardians = (staging.guardians || []).filter((g) => !g._excluded);
      const players = (staging.players || []).filter((p) => !p._excluded);
      const teams = staging.teams || [];
      const exceptions = (staging.exceptions || []).filter((e) => !e._resolution);
      const issues = (staging.issues || []).filter((i) => !i._resolution || i._resolution === 'open');
      const duplicates = (staging.duplicates || []).filter((d) => !job.duplicate_decisions?.[d.id]);
      const preview_counts = {
        guardians: guardians.length, players: players.length, teams: teams.length,
        exceptions: exceptions.length, issues: issues.length, duplicates: duplicates.length,
        client_fixable: issues.filter((i) => i.category === 'client_fixable').length,
        needs_human_review: issues.filter((i) => i.category === 'needs_human_review').length,
      };
      await svc.entities.MigrationJob.update(migrationJobId, { preview_counts, staging_data: staging });
      return Response.json({ ok: true, preview_counts });
    }

    // ---- send_back ----
    if (action === 'send_back') {
      if (!['support_review', 'client_review'].includes(job.status)) {
        return Response.json({ error: `Job is "${job.status}", not awaiting review` }, { status: 400 });
      }
      await svc.entities.MigrationJob.update(migrationJobId, {
        status: 'needs_fixes',
        specialist_name: specialistName,
        specialist_notes: specialistNotes || '',
        reviewed_by_user_id: user.id,
        reviewed_at: new Date().toISOString(),
      });
      // Email the club admin that their migration needs fixes
      await notifyClub(svc, job, 'needs_fixes', specialistNotes || '');
      return Response.json({ status: 'needs_fixes' });
    }

    // ---- approve (start the background commit) ----
    if (action === 'approve') {
      if (!['support_review', 'client_review'].includes(job.status)) {
        return Response.json({ error: `Job is "${job.status}", not awaiting review` }, { status: 400 });
      }
      const totals = computeTotals(job);
      const progress = {
        phase: 'teams',
        index: 0,
        imported: { teams: 0, guardians: 0, players: 0 },
        errors: [],
        last_error: null,
        retry_attempt: 0,
        total: totals,
      };
      await svc.entities.MigrationJob.update(migrationJobId, {
        status: 'processing',
        specialist_name: specialistName,
        specialist_notes: specialistNotes || '',
        reviewed_by_user_id: user.id,
        reviewed_at: new Date().toISOString(),
        commit_progress: progress,
        error_log: [],
      });
      // Import approval deliberately sends no notification during bulk migration.
      return Response.json({ started: true, status: 'processing', progress });
    }

    // ---- commit_step (process next batch) ----
    if (action === 'commit_step') {
      if (job.status === 'completed') return Response.json({ finished: true, ...job.commit_progress });
      if (job.status !== 'processing') {
        return Response.json({ error: `Job is "${job.status}", not processing` }, { status: 400 });
      }
      const result = await commitChunk(svc, job, deriveImportArrays(job));
      return Response.json(result);
    }
  } catch (error) {
    console.error('migration-approve-and-run error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive the importable arrays from the job's staging data + client decisions. */
function deriveImportArrays(job) {
  const staging = job.staging_data || {};
  const dupDecisions = job.duplicate_decisions || {};
  const decisions = job.client_decisions || {};
  const teamSheet = job.team_sheet || [];
  const { guardians: finalGuardians, players: finalPlayers } = applyDuplicateDecisions(
    staging.guardians || [], staging.players || [], staging.duplicates || [], dupDecisions,
  );
  const cancelledHandling = decisions.cancelled_registrations || 'inactive';
  const importablePlayers = cancelledHandling === 'exclude'
    ? finalPlayers.filter((p) => p.status !== 'inactive')
    : finalPlayers;
  const teamSource = teamSheet.length > 0 ? teamSheet : (staging.teams || []);
  return { finalGuardians: finalGuardians.filter((r) => !r._excluded && !r._deleted), importablePlayers: importablePlayers.filter((r) => !r._excluded && !r._deleted), teamSource: teamSource.filter((r) => !r._excluded && !r._deleted), cancelledHandling };
}

function computeTotals(job) {
  const { finalGuardians, importablePlayers, teamSource } = deriveImportArrays(job);
  return {
    teams: teamSource.length,
    guardians: finalGuardians.length,
    players: importablePlayers.length,
  };
}



// ---------------------------------------------------------------------------
// Email notifications to the club admin during the migration workflow
// ---------------------------------------------------------------------------

async function notifyClub(svc, job, event, note) {
  const email = job.requested_by_email;
  if (!email) return; // no email to send to
  const clubName = job.club_name || 'your club';
  const subject = event === 'approved'
    ? `Your migration to ${clubName} is going live`
    : `Your migration to ${clubName} needs fixes`;
  const html = event === 'approved'
    ? `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
       <div style="background:#4f47e6;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
         <h1 style="color:#fff;margin:0;font-size:22px;">Migration Approved</h1>
       </div>
       <div style="padding:24px;background:#f8fafc;border-radius:0 0 12px 12px;">
         <p style="font-size:16px;color:#0b162b;">Hi ${job.requested_by_name || 'there'},</p>
         <p style="font-size:15px;color:#475569;line-height:1.6;">
           Your migration specialist has approved your data and the import to <strong>${clubName}</strong> is now running.
           You'll see your teams, guardians, and players appear in your club shortly.
         </p>
         ${note ? `<div style="background:#e0e7ff;border:1px solid #c7d2fe;border-radius:8px;padding:12px;margin:16px 0;"><p style="margin:0;font-size:14px;color:#312e81;"><strong>Specialist note:</strong> ${note}</p></div>` : ''}
         <p style="font-size:13px;color:#94a3b8;margin-top:24px;">You can check the progress in your Migration tab.</p>
       </div></div>`
    : `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
       <div style="background:#f59e0b;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
         <h1 style="color:#fff;margin:0;font-size:22px;">Migration Needs Fixes</h1>
       </div>
       <div style="padding:24px;background:#f8fafc;border-radius:0 0 12px 12px;">
         <p style="font-size:16px;color:#0b162b;">Hi ${job.requested_by_name || 'there'},</p>
         <p style="font-size:15px;color:#475569;line-height:1.6;">
           Your migration specialist reviewed your data and found a few things that need your attention before the import can proceed.
         </p>
         ${note ? `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px;margin:16px 0;"><p style="margin:0;font-size:14px;color:#78350f;"><strong>Specialist note:</strong> ${note}</p></div>` : ''}
         <p style="font-size:15px;color:#475569;line-height:1.6;">Please log in to your club, open the Migration tab, and address the items below.</p>
         <p style="font-size:13px;color:#94a3b8;margin-top:24px;">Source: ${job.competitor_source || 'your export'}</p>
       </div></div>`;
  try {
    await svc.integrations.Core.SendEmail({ to: email, subject, html });
  } catch (e) {
    console.error('Migration notification email failed', e.message);
  }
}