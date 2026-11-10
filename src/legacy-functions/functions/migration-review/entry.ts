// @ts-nocheck
// Phase 2/3 of the migration import tool: staging, validation, specialist review,
// sign-off, dry run, commit (resumable) and rollback. Every action loads the
// project first and restricts every read and write to the project's club.
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { canManageMigrationClub, isMigrationReviewer } from '../../shared/migrationAccess.ts';
import { TARGETS, parseFileRows } from '../../shared/migrationAutomap.ts';
import { buildDrafts, dedupeDrafts, fileOrder, dedupeKey, stableUniqueId, normalizeFieldValue } from '../../shared/migrationStaging.ts';
import { reconcile } from '../../shared/migrationValidate.ts';
import { HttpError, fetchAll, inBatches, readPrivateFile } from '../../shared/migrationFiles.ts';
import { runValidation, refreshStatuses } from './data.ts';
import { dryRun, commitStep, rollback } from './commit.ts';

const low = (x) => String(x ?? '').trim().toLowerCase();
const MUTABLE = ['staged', 'specialist_review', 'approved'];
const LINK_FIELDS = { guardian_email: 'guardian_emails', team_name: 'team_name', location_name: 'location_name' };
const PAGE = 50;

const maskEmail = (e) => { const s = String(e || ''); const i = s.indexOf('@'); return i > 1 ? `${s[0]}***${s.slice(i)}` : s ? '***' : ''; };
const maskPhone = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.length >= 4 ? `•••-${d.slice(-4)}` : p ? '•••' : ''; };
const maskMapped = (m = {}) => {
  const o = { ...m };
  for (const k of Object.keys(o)) {
    if (/email/.test(k)) o[k] = maskEmail(o[k]);
    else if (/phone/.test(k)) o[k] = maskPhone(o[k]);
    else if (k === 'medical_notes') o[k] = o[k] ? '(hidden)' : '';
  }
  return o;
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const svc = base44.asServiceRole;
    const body = await req.json();
    const who = user.email || user.id;
    const adminLike = user.role === 'admin' || user.is_super_admin === true || ['system_owner', 'system_admin'].includes(user.system_role);

    const reviewerOk = (project) =>
      isMigrationReviewer(user) && (adminLike || !project.assigned_specialist || low(project.assigned_specialist) === low(user.email));

    // mode 'review' = reviewers only; 'club' = club admins of that club or reviewers.
    const loadProject = async (id, mode = 'club') => {
      const project = id ? await svc.entities.MigrationProject.get(id) : null;
      if (!project) throw new HttpError(404, 'Project not found');
      if (mode === 'review') {
        if (!reviewerOk(project)) throw new HttpError(403, 'Only the assigned migration specialist can do this');
      } else if (!reviewerOk(project) && !(await canManageMigrationClub(svc, user, project.club_id))) {
        throw new HttpError(403, 'You do not have access to this club');
      }
      return project;
    };
    const log = (project, action, detail = '') =>
      svc.entities.ReviewLog.create({ project_id: project.id, club_id: project.club_id, actor: who, action, detail: String(detail).slice(0, 300) });
    const setStatus = async (project, status, note, extra = {}) => {
      const history = [...(project.history || []), { status, by: who, at: new Date().toISOString(), note: note || '' }];
      return svc.entities.MigrationProject.update(project.id, { status, history, ...extra });
    };
    const requireMutable = (project) => {
      if (!MUTABLE.includes(project.status)) throw new HttpError(409, `This project is ${project.status.replace('_', ' ')} and can no longer be edited here`);
    };
    // Any data change withdraws earlier sign-offs.
    const invalidateApproval = async (project) => {
      if (project.status === 'approved') await setStatus(project, 'specialist_review', 'Data changed after approval');
      if ((project.approvals || []).length) await svc.entities.MigrationProject.update(project.id, { approvals: [] });
    };
    const scoped = (project, extra = {}) => ({ project_id: project.id, club_id: project.club_id, ...extra });

    switch (body.action) {
      // ---------------------------------------------------------------- queue
      case 'queue': {
        if (!isMigrationReviewer(user)) throw new HttpError(403, 'Reviewers only');
        const all = await svc.entities.MigrationProject.filter({}, '-updated_date', 300);
        const projects = all.filter((p) => p.status !== 'draft' && (adminLike || !p.assigned_specialist || low(p.assigned_specialist) === low(user.email)));
        const clubIds = [...new Set(projects.map((p) => p.club_id))];
        const clubs = clubIds.length ? await svc.entities.Club.filter({ id: { $in: clubIds } }, 'created_date', 300) : [];
        const names = new Map(clubs.map((c) => [c.id, c.name]));
        return Response.json({
          can_assign: adminLike,
          projects: projects.map((p) => ({
            id: p.id, name: p.name, club_id: p.club_id, club_name: names.get(p.club_id) || 'Club', status: p.status,
            assigned_specialist: p.assigned_specialist || '', created_date: p.created_date, updated_date: p.updated_date,
            source_system: p.source_system, summary: p.stage_summary || {},
          })),
        });
      }

      // ------------------------------------------------------- club admin view
      case 'club_overview': {
        const project = await loadProject(body.project_id);
        const files = await svc.entities.MigrationFile.filter(scoped(project), 'created_date', 100);
        return Response.json({
          project: { id: project.id, name: project.name, status: project.status, season: project.season, source_system: project.source_system, history: project.history || [], questions: project.questions || [], stage_summary: project.stage_summary || {}, commit_summary: project.commit_summary || {}, failure_reason: project.failure_reason || '' },
          files: files.map((f) => ({ id: f.id, name: f.original_name, entity: f.selected_entity, rows: f.row_count, status: f.status })),
        });
      }

      case 'answer_question': {
        const project = await loadProject(body.project_id);
        const answer = String(body.answer || '').trim();
        if (!answer) throw new HttpError(400, 'Please type an answer');
        const questions = (project.questions || []).map((q) => q.id === body.question_id ? { ...q, answer: answer.slice(0, 1000), answered_by: who, answered_at: new Date().toISOString() } : q);
        await svc.entities.MigrationProject.update(project.id, { questions });
        await log(project, 'question_answered');
        return Response.json({ ok: true });
      }

      case 'submit_for_review': {
        const project = await loadProject(body.project_id);
        if (project.status !== 'staged') throw new HttpError(409, 'Prepare and validate the data before submitting');
        await setStatus(project, 'specialist_review', 'Submitted by the club for specialist review');
        await log(project, 'submitted_for_review');
        return Response.json({ ok: true });
      }

      // ---------------------------------------------------------------- staging
      case 'stage_project': {
        const project = await loadProject(body.project_id);
        if (!['analyzed', 'mapping_review', 'staged', 'specialist_review', 'approved'].includes(project.status)) {
          throw new HttpError(409, 'This project can no longer be re-staged');
        }
        const files = await svc.entities.MigrationFile.filter(scoped(project), 'created_date', 100);
        if (!files.length) throw new HttpError(400, 'Upload at least one file first');
        const unconfirmed = files.filter((f) => f.status !== 'confirmed');
        if (unconfirmed.length) throw new HttpError(400, `Confirm the mapping for: ${unconfirmed.map((f) => f.original_name).join(', ')}`);
        const mappings = await fetchAll(svc.entities.ColumnMapping, scoped(project), 'source_index');

        const drafts = [];
        for (const file of [...files].sort((a, b) => fileOrder(a.selected_entity) - fileOrder(b.selected_entity))) {
          const { text } = await readPrivateFile(svc, file.file_uri);
          const { headers, rows } = parseFileRows(text);
          drafts.push(...buildDrafts({ file, headers, rows, mappings: mappings.filter((m) => m.file_id === file.id) }));
        }
        const staged = dedupeDrafts(drafts, project.club_id);

        await svc.entities.StagedRecord.deleteMany(scoped(project));
        await svc.entities.ValidationIssue.deleteMany(scoped(project));
        const payload = staged.map((d) => ({
          project_id: project.id, club_id: project.club_id, entity: d.entity, is_primary: d.is_primary,
          source_file_id: d.source_file_id, source_row_number: d.source_row_number, group: d.group,
          dedupe_key: d.dedupe_key, unique_id: d.unique_id, raw_data: d.raw_data, mapped_data: d.mapped_data,
          links: d.links, changes: d.changes, status: d.status || 'pending', merged_into: d.merged_key || '',
        }));
        const created = (await inBatches(payload, 200, (slice) => svc.entities.StagedRecord.bulkCreate(slice))).flat();
        const { summary } = await runValidation(svc, project, created);

        await svc.entities.MigrationProject.update(project.id, { approvals: [], failure_reason: '' });
        if (project.status !== 'staged') await setStatus(project, 'staged', 'Data staged and validated');
        await log(project, 'staged', `${created.length} staged records from ${files.length} file(s)`);
        return Response.json({ ok: true, summary });
      }

      // --------------------------------------------------------------- reviewer
      case 'review_overview': {
        const project = await loadProject(body.project_id, 'review');
        const [files, mappings, records, issues, logs, club] = await Promise.all([
          svc.entities.MigrationFile.filter(scoped(project), 'created_date', 100),
          fetchAll(svc.entities.ColumnMapping, scoped(project), 'source_index'),
          fetchAll(svc.entities.StagedRecord, scoped(project)),
          fetchAll(svc.entities.ValidationIssue, scoped(project)),
          svc.entities.ReviewLog.filter(scoped(project), '-created_date', 40),
          svc.entities.Club.get(project.club_id),
        ]);
        const rec = reconcile({ files, mappings, records, issues, project });
        const facets = { rule: {}, entity: {}, severity: {}, file: {} };
        for (const i of issues.filter((x) => x.resolution === 'open')) {
          for (const [k, v] of [['rule', i.rule], ['entity', i.entity], ['severity', i.severity], ['file', i.source_file_id]]) facets[k][v] = (facets[k][v] || 0) + 1;
        }
        return Response.json({
          project: { ...project, club_name: club?.name || 'Club' },
          files, mappings, reconciliation: rec, facets, logs, can_assign: adminLike,
          summary: project.stage_summary || {},
        });
      }

      case 'list_issues': {
        const project = await loadProject(body.project_id, 'review');
        const q = scoped(project);
        for (const k of ['severity', 'entity', 'rule', 'resolution']) if (body[k]) q[k] = body[k];
        if (body.file_id) q.source_file_id = body.file_id;
        const page = Math.max(0, Number(body.page) || 0);
        const rows = await svc.entities.ValidationIssue.filter(q, 'source_row_number', PAGE + 1, page * PAGE);
        const slice = rows.slice(0, PAGE);
        const recIds = [...new Set(slice.map((i) => i.staged_record_id))];
        const recs = recIds.length ? await svc.entities.StagedRecord.filter({ ...scoped(project), id: { $in: recIds } }, 'created_date', 500) : [];
        const byId = new Map(recs.map((r) => [r.id, r]));
        return Response.json({
          has_more: rows.length > PAGE,
          issues: slice.map((i) => {
            const r = byId.get(i.staged_record_id);
            const m = r?.mapped_data || {};
            const fieldValue = i.field === 'guardian_email' ? (r?.links?.guardian_emails || []).join(', ') : LINK_FIELDS[i.field] ? r?.links?.[i.field] : m[i.field];
            return { ...i, record_label: [m.first_name, m.last_name].filter(Boolean).join(' ') || m.name || '(no name)', record_status: r?.status, value: fieldValue ?? '', record: maskMapped(m) };
          }),
        });
      }

      case 'list_records': {
        const project = await loadProject(body.project_id, 'review');
        const q = scoped(project);
        if (body.entity) q.entity = body.entity;
        if (body.status) q.status = body.status;
        if (body.file_id) q.source_file_id = body.file_id;
        const page = Math.max(0, Number(body.page) || 0);
        const term = low(body.q);
        const shape = (r) => ({ id: r.id, entity: r.entity, status: r.status, is_primary: r.is_primary, source_row_number: r.source_row_number, source_file_id: r.source_file_id, mapped: maskMapped(r.mapped_data), matched_live_id: r.matched_live_id || '', commit_action: r.commit_action || '' });
        if (term) {
          const all = (await fetchAll(svc.entities.StagedRecord, q, 'source_row_number'))
            .filter((r) => JSON.stringify(r.mapped_data).toLowerCase().includes(term) || (r.links?.guardian_emails || []).some((e) => low(e).includes(term)));
          return Response.json({ has_more: all.length > (page + 1) * PAGE, records: all.slice(page * PAGE, (page + 1) * PAGE).map(shape) });
        }
        const rows = await svc.entities.StagedRecord.filter(q, 'source_row_number', PAGE + 1, page * PAGE);
        return Response.json({ has_more: rows.length > PAGE, records: rows.slice(0, PAGE).map(shape) });
      }

      case 'get_record': {
        const rec0 = body.record_id ? await svc.entities.StagedRecord.get(body.record_id) : null;
        if (!rec0) throw new HttpError(404, 'Record not found');
        const project = await loadProject(rec0.project_id, 'review');
        if (rec0.club_id !== project.club_id) throw new HttpError(403, 'Not allowed');
        const issues = await svc.entities.ValidationIssue.filter(scoped(project, { staged_record_id: rec0.id }), 'created_date', 100);
        let liveRecord = null;
        const liveId = rec0.committed_id || rec0.matched_live_id;
        if (liveId) {
          const found = await svc.entities[rec0.entity].filter({ club_id: project.club_id, id: liveId }, 'created_date', 1);
          liveRecord = found[0] || null;
        }
        await log(project, 'viewed_record', `${rec0.entity} row ${rec0.source_row_number}`);
        return Response.json({ record: rec0, issues, live: liveRecord, targets: TARGETS[rec0.entity].map((f) => ({ name: f.name, label: f.label })) });
      }

      case 'fix_field': {
        const project = await loadProject(body.project_id, 'review');
        requireMutable(project);
        const rec = await svc.entities.StagedRecord.get(body.record_id);
        if (!rec || rec.club_id !== project.club_id || rec.project_id !== project.id) throw new HttpError(404, 'Record not found');
        applyFix(rec, body.field, body.value);
        await svc.entities.StagedRecord.update(rec.id, { mapped_data: rec.mapped_data, links: rec.links, changes: rec.changes, dedupe_key: rec.dedupe_key, unique_id: rec.unique_id });
        await invalidateApproval(project);
        await runValidation(svc, project);
        await log(project, 'fix_field', `${rec.entity} row ${rec.source_row_number}: edited ${body.field}`);
        return Response.json({ ok: true });
      }

      case 'bulk_fix': {
        const project = await loadProject(body.project_id, 'review');
        requireMutable(project);
        const q = scoped(project, { rule: body.rule, resolution: 'open' });
        if (body.entity) q.entity = body.entity;
        if (body.field) q.field = body.field;
        const issues = await fetchAll(svc.entities.ValidationIssue, q);
        const ids = [...new Set(issues.map((i) => i.staged_record_id))];
        const recs = [];
        await inBatches(ids, 200, async (chunk) => { recs.push(...await svc.entities.StagedRecord.filter(scoped(project, { id: { $in: chunk } }), 'created_date', 500)); });
        const targets = recs.filter((r) => {
          if (body.match_value === undefined || body.match_value === '') return true;
          const cur = LINK_FIELDS[body.field] ? r.links?.[LINK_FIELDS[body.field]] : r.mapped_data?.[body.field];
          return low(Array.isArray(cur) ? cur[0] : cur) === low(body.match_value);
        });
        for (const r of targets) applyFix(r, body.field, body.value);
        await inBatches(targets, 100, (slice) => svc.entities.StagedRecord.bulkUpdate(slice.map((r) => ({ id: r.id, mapped_data: r.mapped_data, links: r.links, changes: r.changes, dedupe_key: r.dedupe_key, unique_id: r.unique_id }))));
        await invalidateApproval(project);
        await runValidation(svc, project);
        await log(project, 'bulk_fix', `${targets.length} record(s): set ${body.field} (rule ${body.rule})`);
        return Response.json({ ok: true, changed: targets.length });
      }

      case 'resolve_issues': {
        const project = await loadProject(body.project_id, 'review');
        requireMutable(project);
        let issues;
        if (Array.isArray(body.issue_ids) && body.issue_ids.length) {
          issues = [];
          await inBatches(body.issue_ids, 200, async (chunk) => { issues.push(...await svc.entities.ValidationIssue.filter(scoped(project, { id: { $in: chunk } }), 'created_date', 500)); });
        } else if (body.filter?.rule) {
          const q = scoped(project, { rule: body.filter.rule, resolution: 'open' });
          if (body.filter.entity) q.entity = body.filter.entity;
          issues = await fetchAll(svc.entities.ValidationIssue, q);
        } else throw new HttpError(400, 'Choose issues to resolve');
        issues = issues.filter((i) => i.resolution === 'open');
        const note = String(body.note || '').slice(0, 300);

        if (body.resolution === 'accepted') {
          if (issues.some((i) => i.severity === 'error')) throw new HttpError(400, 'Errors cannot be accepted. Fix the value or exclude the row.');
          await inBatches(issues, 200, (slice) => svc.entities.ValidationIssue.bulkUpdate(slice.map((i) => ({ id: i.id, resolution: 'accepted', resolved_by: who, note }))));
          const records = await fetchAll(svc.entities.StagedRecord, scoped(project));
          const all = await fetchAll(svc.entities.ValidationIssue, scoped(project));
          await refreshStatuses(svc, project, records, all);
        } else if (body.resolution === 'excluded') {
          const ids = [...new Set(issues.map((i) => i.staged_record_id))];
          await inBatches(ids, 200, (slice) => svc.entities.StagedRecord.bulkUpdate(slice.map((id) => ({ id, status: 'excluded' }))));
          await runValidation(svc, project);
        } else if (body.resolution === 'fixed' && ['update', 'create'].includes(body.decision)) {
          const ids = [...new Set(issues.filter((i) => i.rule === 'dup_live').map((i) => i.staged_record_id))];
          await inBatches(ids, 200, (slice) => svc.entities.StagedRecord.bulkUpdate(slice.map((id) => ({ id, match_decision: body.decision }))));
          await runValidation(svc, project);
        } else throw new HttpError(400, 'Unknown resolution');
        await invalidateApproval(project);
        await log(project, `issues_${body.resolution}`, `${issues.length} issue(s)${body.decision ? `, decision: ${body.decision}` : ''}${note ? `, note: ${note}` : ''}`);
        return Response.json({ ok: true, count: issues.length });
      }

      case 'restore_records': {
        const project = await loadProject(body.project_id, 'review');
        requireMutable(project);
        const ids = (body.record_ids || []).slice(0, 500);
        await inBatches(ids, 200, (slice) => svc.entities.StagedRecord.bulkUpdate(slice.map((id) => ({ id, status: 'pending' }))));
        await invalidateApproval(project);
        await runValidation(svc, project);
        await log(project, 'records_restored', `${ids.length} record(s)`);
        return Response.json({ ok: true });
      }

      case 'exclude_records': {
        const project = await loadProject(body.project_id, 'review');
        requireMutable(project);
        const ids = (body.record_ids || []).slice(0, 500);
        await inBatches(ids, 200, (slice) => svc.entities.StagedRecord.bulkUpdate(slice.map((id) => ({ id, status: 'excluded' }))));
        await invalidateApproval(project);
        await runValidation(svc, project);
        await log(project, 'records_excluded', `${ids.length} record(s)`);
        return Response.json({ ok: true });
      }

      case 'signoff_columns': {
        const project = await loadProject(body.project_id, 'review');
        requireMutable(project);
        const maps = await fetchAll(svc.entities.ColumnMapping, scoped(project));
        const pick = maps.filter((m) => m.status === 'ignored' && !m.signoff_by && (!body.mapping_ids || body.mapping_ids.includes(m.id)));
        await inBatches(pick, 200, (slice) => svc.entities.ColumnMapping.bulkUpdate(slice.map((m) => ({ id: m.id, signoff_by: who }))));
        await invalidateApproval(project);
        await log(project, 'columns_signed_off', `${pick.length} column(s)`);
        return Response.json({ ok: true, count: pick.length });
      }

      case 'ask_question': {
        const project = await loadProject(body.project_id, 'review');
        const text = String(body.text || '').trim();
        if (!text) throw new HttpError(400, 'Type a question');
        const questions = [...(project.questions || []), { id: crypto.randomUUID(), text: text.slice(0, 500), asked_by: user.full_name || who, asked_at: new Date().toISOString(), answer: '' }];
        await svc.entities.MigrationProject.update(project.id, { questions });
        await log(project, 'question_asked');
        return Response.json({ ok: true });
      }

      case 'assign': {
        if (!adminLike) throw new HttpError(403, 'Only administrators can assign specialists');
        const project = await loadProject(body.project_id, 'review');
        await svc.entities.MigrationProject.update(project.id, { assigned_specialist: String(body.specialist || '').trim() });
        await log(project, 'assigned', body.specialist ? 'specialist assigned' : 'specialist cleared');
        return Response.json({ ok: true });
      }

      case 'set_options': {
        const project = await loadProject(body.project_id, 'review');
        const patch = {};
        if (typeof body.second_person_approval === 'boolean') patch.second_person_approval = body.second_person_approval;
        if (Number(body.rollback_window_days) > 0) patch.rollback_window_days = Math.min(90, Number(body.rollback_window_days));
        await svc.entities.MigrationProject.update(project.id, patch);
        await log(project, 'options_changed');
        return Response.json({ ok: true });
      }

      case 'start_review': {
        const project = await loadProject(body.project_id, 'review');
        if (project.status === 'staged') await setStatus(project, 'specialist_review', 'Review started');
        await log(project, 'review_started');
        return Response.json({ ok: true });
      }

      case 'send_back': {
        const project = await loadProject(body.project_id, 'review');
        requireMutable(project);
        const note = String(body.note || '').trim();
        const patch = { approvals: [] };
        if (note) patch.questions = [...(project.questions || []), { id: crypto.randomUUID(), text: note.slice(0, 500), asked_by: user.full_name || who, asked_at: new Date().toISOString(), answer: '' }];
        await setStatus(project, 'mapping_review', 'Sent back to mapping review', patch);
        await log(project, 'sent_back');
        return Response.json({ ok: true });
      }

      case 'approve': {
        const project = await loadProject(body.project_id, 'review');
        requireMutable(project);
        const [files, mappings, records, issues] = await Promise.all([
          svc.entities.MigrationFile.filter(scoped(project), 'created_date', 100),
          fetchAll(svc.entities.ColumnMapping, scoped(project)),
          fetchAll(svc.entities.StagedRecord, scoped(project)),
          fetchAll(svc.entities.ValidationIssue, scoped(project)),
        ]);
        const rec = reconcile({ files, mappings, records, issues, project });
        if (!rec.complete) throw new HttpError(400, `Sign-off checklist incomplete: ${rec.checklist.filter((c) => !c.ok).map((c) => c.label).join('; ')}`);
        const approvals = project.approvals || [];
        if (approvals.some((a) => low(a.by) === low(who))) {
          if (project.second_person_approval && approvals.length < 2) throw new HttpError(409, 'You already approved. A second person must approve.');
        } else approvals.push({ by: who, at: new Date().toISOString() });
        const need = project.second_person_approval ? 2 : 1;
        const approved = new Set(approvals.map((a) => low(a.by))).size >= need;
        await svc.entities.MigrationProject.update(project.id, { approvals });
        if (approved) await setStatus(project, 'approved', 'Approved for go-live');
        await log(project, approved ? 'approved' : 'approval_recorded');
        return Response.json({ ok: true, approved, waiting_for_second: !approved });
      }

      case 'dry_run': {
        const project = await loadProject(body.project_id, 'review');
        requireMutable(project);
        const result = await dryRun(svc, project);
        await log(project, 'dry_run');
        return Response.json({ dry_run: result });
      }

      case 'commit_step': {
        const project = await loadProject(body.project_id, 'review');
        if (!['approved', 'committing', 'failed'].includes(project.status)) throw new HttpError(409, 'The project must be approved before going live');
        if (project.status !== 'committing') {
          await setStatus(project, 'committing', project.status === 'failed' ? 'Commit resumed' : 'Go-live started', { failure_reason: '' });
          await log(project, project.status === 'failed' ? 'commit_resumed' : 'commit_started');
        }
        let step;
        try {
          step = await commitStep(svc, project);
        } catch (e) {
          await setStatus(project, 'failed', 'Commit stopped', { failure_reason: 'A batch write failed. Nothing was sent to families. Resume to retry or roll back.' });
          await log(project, 'commit_failed', 'batch write failed');
          throw new HttpError(500, 'The commit stopped part-way. Resume it to retry, or roll it back.');
        }
        if (step.finished) {
          const patch = { committed_at: new Date().toISOString(), commit_summary: step.counts, failure_reason: step.verified ? '' : 'Verification mismatch: live counts do not match the approved numbers.' };
          await setStatus(project, step.verified ? 'live' : 'failed', step.verified ? 'Committed and verified' : 'Verification failed', patch);
          await log(project, step.verified ? 'live' : 'verification_failed');
        }
        return Response.json(step);
      }

      case 'rollback': {
        const project = await loadProject(body.project_id, 'review');
        if (!['live', 'failed', 'committing'].includes(project.status)) throw new HttpError(409, 'There is nothing to roll back');
        const result = await rollback(svc, project);
        await setStatus(project, 'rolled_back', String(body.note || 'Rolled back'), { commit_summary: {}, approvals: [] });
        await log(project, 'rolled_back');
        return Response.json({ ok: true, ...result });
      }

      default:
        throw new HttpError(400, 'Unknown action');
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
}

// Applies a specialist edit to a staged record in place.
function applyFix(rec, field, value) {
  rec.mapped_data = { ...(rec.mapped_data || {}) };
  rec.links = { ...(rec.links || {}) };
  rec.changes = [...(rec.changes || [])];
  const text = String(value ?? '').trim();
  if (LINK_FIELDS[field]) {
    rec.links[LINK_FIELDS[field]] = field === 'guardian_email' ? (text ? [text.toLowerCase()] : []) : text;
  } else {
    if (!TARGETS[rec.entity].some((f) => f.name === field)) throw new HttpError(400, 'Unknown field');
    const n = normalizeFieldValue(rec.entity, field, text);
    rec.mapped_data[field] = n ? n.value : text;
    if (rec.changes.length < 20) rec.changes.push({ field, before: '(specialist edit)', after: String(rec.mapped_data[field]).slice(0, 80) });
  }
  rec.dedupe_key = dedupeKey(rec.entity, rec.mapped_data, rec.links) || rec.dedupe_key;
  rec.unique_id = stableUniqueId(rec.entity, `${rec.club_id}|${rec.dedupe_key}`, rec.mapped_data);
}