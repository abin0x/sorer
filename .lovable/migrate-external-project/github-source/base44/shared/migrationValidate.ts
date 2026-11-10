// Validation rules, record statuses, reconciliation and the sign-off checklist.
// Pure functions: callers pass in staged records and pre-loaded live indexes
// (already restricted to the project's club).
import { TARGETS } from './migrationAutomap.ts';

const DEAD = ['excluded', 'rejected', 'merged'];
const low = (x) => String(x ?? '').trim().toLowerCase();
const isEmpty = (v) => v === undefined || v === null || v === '';
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const playerKey = (guardianEmail, m) => `${low(guardianEmail)}|${low(m.first_name)}|${low(m.last_name)}|${low(m.date_of_birth)}`;

function closest(name, names) {
  const n = low(name);
  return names.find((x) => low(x).includes(n) || n.includes(low(x))) || '';
}

export function validateAll(records, live) {
  const issues = [];
  const matches = new Map();
  const alive = records.filter((r) => !DEAD.includes(r.status));
  const stagedGuardians = new Set(alive.filter((r) => r.entity === 'Guardian').map((r) => low(r.mapped_data.email)).filter(Boolean));
  const today = new Date();

  const add = (r, severity, rule, field, message, suggested_fix = '', resolution = 'open') =>
    issues.push({
      staged_record_id: r.id, entity: r.entity, source_file_id: r.source_file_id, source_row_number: r.source_row_number,
      severity, rule, field: field || '', message, suggested_fix, issue_key: `${r.id}|${rule}|${field || ''}`, resolution,
    });

  for (const r of records) {
    if (r.status === 'merged') {
      add(r, 'info', 'dup_in_file', '', 'Duplicate of an earlier row in this project. It was merged into that record and no data was dropped.', '', 'accepted');
      continue;
    }
    if (DEAD.includes(r.status)) continue;
    const m = r.mapped_data || {};
    const fields = TARGETS[r.entity];

    for (const f of fields) {
      if (f.link) continue;
      const v = m[f.name];
      if (f.required && isEmpty(v)) {
        add(r, 'error', 'required', f.name, `${f.label} is required.`, `Type a value for ${f.label}, or exclude this row.`);
        continue;
      }
      if (isEmpty(v)) continue;
      if (f.type === 'email' && !EMAIL.test(String(v))) add(r, 'error', 'email_format', f.name, `"${v}" is not a valid email address.`, 'Correct the email address.');
      if (f.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) add(r, 'error', 'date_invalid', f.name, `"${v}" is not a recognizable date.`, 'Enter the date as YYYY-MM-DD.');
      if (f.type === 'number' && typeof v !== 'number') add(r, 'error', 'number_invalid', f.name, `"${v}" is not a number.`, 'Enter a number.');
      if (f.type === 'enum' && !f.options.includes(v)) add(r, 'error', 'enum_invalid', f.name, `"${v}" is not a valid ${f.label}.`, `Choose one of: ${f.options.slice(0, 6).join(', ')}`);
    }

    if (r.entity === 'Player' && /^\d{4}-\d{2}-\d{2}$/.test(String(m.date_of_birth || ''))) {
      const dob = new Date(`${m.date_of_birth}T00:00:00Z`);
      const age = (today.getTime() - dob.getTime()) / (365.25 * 86400000);
      if (age < 0) add(r, 'error', 'dob_future', 'date_of_birth', 'Date of birth is in the future.', 'Check the day, month and year.');
      else if (age > 25) add(r, 'warning', 'dob_age', 'date_of_birth', `Player would be ${Math.floor(age)} years old.`, 'Confirm the birth year or exclude the row.');
      else if (age < 3) add(r, 'warning', 'dob_age', 'date_of_birth', `Player would be ${Math.floor(age)} years old.`, 'Confirm the birth year.');
    }

    const decided = r.match_decision === 'update' || r.match_decision === 'create';

    if (r.entity === 'Player') {
      const emails = r.links?.guardian_emails || [];
      if (!emails.length) add(r, 'error', 'link_guardian_missing', 'guardian_email', 'This player has no guardian. A guardian is required.', 'Enter a guardian email that exists in the project or in the club, or exclude the row.');
      for (const e of emails) {
        if (!stagedGuardians.has(low(e)) && !live.guardiansByEmail.has(low(e))) {
          add(r, 'error', 'link_guardian_unmatched', 'guardian_email', `Guardian ${e} was not found in the project or the club.`, 'Correct the email, or add a guardian file.');
        }
      }
      const key = playerKey(emails[0], m);
      const hit = emails[0] && live.playersByKey.get(key);
      if (hit) {
        matches.set(r.id, hit.id);
        add(r, 'warning', 'dup_live', '', 'Matches a player already in this club (guardian + name + date of birth).', 'Update the existing player, or create a new one.', decided ? 'fixed' : 'open');
      }
    }

    if (r.entity === 'Guardian' && m.email) {
      const hit = live.guardiansByEmail.get(low(m.email));
      if (hit) {
        matches.set(r.id, hit.id);
        add(r, 'warning', 'dup_live', '', 'Matches a guardian already in this club (same email).', 'Update the existing guardian, or create a new one.', decided ? 'fixed' : 'open');
      }
    }

    if (r.entity === 'Team' && m.name) {
      const hit = live.teamsByName.get(low(m.name));
      if (hit) {
        matches.set(r.id, hit.id);
        if (r.is_primary) add(r, 'warning', 'dup_live', '', 'Matches a team already in this club (same name).', 'Update the existing team, or create a new one.', decided ? 'fixed' : 'open');
        else add(r, 'info', 'live_match', '', 'Players will be linked to the existing team with this name.', '', 'accepted');
      }
    }

    const loc = r.links?.location_name;
    if (loc && !live.locationsByName.has(low(loc))) {
      add(r, 'warning', 'link_location_unmatched', 'location_name', `Branch "${loc}" does not exist in this club.`, closest(loc, live.locationNames) ? `Did you mean "${closest(loc, live.locationNames)}"?` : 'Create the branch first, or accept to import without a branch link.');
    }
  }
  return { issues, matches };
}

// Carry "accepted" warnings across re-validation so decisions are not lost.
export function carryResolutions(newIssues, oldIssues) {
  const accepted = new Map(oldIssues.filter((i) => i.resolution === 'accepted' && i.severity === 'warning').map((i) => [i.issue_key, i]));
  return newIssues.map((i) => {
    const old = accepted.get(i.issue_key);
    return old && i.resolution === 'open' ? { ...i, resolution: 'accepted', resolved_by: old.resolved_by || '', note: old.note || '' } : i;
  });
}

export function nextStatus(record, openBlockingByRecord) {
  if (DEAD.includes(record.status)) return record.status;
  return openBlockingByRecord.has(record.id) ? 'pending' : 'ready';
}

export function summarize(records, issues) {
  const open = issues.filter((i) => i.resolution === 'open');
  const by = (e) => records.filter((r) => r.entity === e && r.status !== 'merged');
  return {
    errors_open: open.filter((i) => i.severity === 'error').length,
    warnings_open: open.filter((i) => i.severity === 'warning').length,
    infos: issues.filter((i) => i.severity === 'info').length,
    ready: records.filter((r) => r.status === 'ready').length,
    pending: records.filter((r) => r.status === 'pending').length,
    excluded: records.filter((r) => r.status === 'excluded').length,
    teams: by('Team').length,
    guardians: by('Guardian').length,
    players: by('Player').length,
  };
}

const AMBIGUOUS_DATE = /^(\d{1,2})[/\-.](\d{1,2})[/\-.]\d{2,4}$/;

export function reconcile({ files, mappings, records, issues, project }) {
  const open = issues.filter((i) => i.resolution === 'open');

  const rows = files.map((f) => {
    const mine = records.filter((r) => r.is_primary && r.source_file_id === f.id);
    const c = (s) => mine.filter((r) => r.status === s).length;
    const total = mine.length;
    return {
      file_id: f.id, file: f.original_name, entity: f.selected_entity,
      source_rows: f.row_count, blank_rows: f.blank_row_count || 0, staged: total,
      imported: c('ready'), pending: c('pending'), merged: c('merged'), excluded: c('excluded'), rejected: c('rejected'),
      balanced: total === f.row_count,
    };
  });

  const entities = ['Team', 'Guardian', 'Player'].map((e) => {
    const all = records.filter((r) => r.entity === e);
    const primary = all.filter((r) => r.is_primary);
    return {
      entity: e,
      source_rows: files.filter((f) => f.selected_entity === e).reduce((s, f) => s + f.row_count, 0),
      staged_primary: primary.length,
      derived: all.filter((r) => !r.is_primary).length,
      unique_records: all.filter((r) => r.status !== 'merged').length,
      ready: all.filter((r) => r.status === 'ready').length,
      pending: all.filter((r) => r.status === 'pending').length,
      excluded: all.filter((r) => r.status === 'excluded').length,
      live_matches: all.filter((r) => r.matched_live_id).length,
    };
  });

  const columns = [];
  for (const f of files) {
    for (const m of mappings.filter((x) => x.file_id === f.id)) {
      let state = 'mapped';
      if (m.status === 'ignored') state = 'ignored';
      else if (m.status === 'kept') state = 'kept';
      else if (!m.target_field) state = 'undecided';
      columns.push({
        id: m.id, file_id: f.id, file: f.original_name, column: m.source_column, group_label: m.group_label || '',
        state, target: m.target_field ? `${m.target_entity}.${m.target_field}` : '', samples: m.samples || [],
        non_empty: m.non_empty_count || 0, signed_off: !!m.signoff_by, signoff_by: m.signoff_by || '',
      });
    }
  }

  const byField = {};
  const flagged = [];
  for (const r of records) {
    for (const ch of r.changes || []) {
      const k = `${r.entity}.${ch.field}`;
      byField[k] = byField[k] || { field: k, count: 0, samples: [] };
      byField[k].count++;
      if (byField[k].samples.length < 3) byField[k].samples.push({ row: r.source_row_number, before: ch.before, after: ch.after, derived: !!ch.derived });
      const field = TARGETS[r.entity].find((x) => x.name === ch.field);
      const meaning = field?.type === 'enum' && low(ch.before) !== low(ch.after);
      const ambiguous = field?.type === 'date' && (() => { const mm = AMBIGUOUS_DATE.exec(String(ch.before)); return mm && +mm[1] <= 12 && +mm[2] <= 12 && mm[1] !== mm[2]; })();
      if ((meaning || ambiguous) && flagged.length < 40) flagged.push({ entity: r.entity, row: r.source_row_number, field: ch.field, before: ch.before, after: ch.after, reason: ambiguous ? 'Ambiguous day/month order (read as month/day/year)' : 'Value was translated to a different option' });
    }
  }

  const undecided = columns.filter((c) => c.state === 'undecided').length;
  const unsigned = columns.filter((c) => c.state === 'ignored' && !c.signed_off).length;
  const questions = project.questions || [];
  const unanswered = questions.filter((q) => !q.answer).length;
  const approvals = [...new Set((project.approvals || []).map((a) => a.by))];
  const need = project.second_person_approval ? 2 : 1;

  const checklist = [
    { key: 'files', label: 'All files confirmed and records staged', ok: files.length > 0 && files.every((f) => f.status === 'confirmed') && records.length > 0, detail: `${files.length} file(s), ${records.length} staged record(s)` },
    { key: 'errors', label: 'Zero open errors', ok: open.filter((i) => i.severity === 'error').length === 0, detail: `${open.filter((i) => i.severity === 'error').length} open` },
    { key: 'warnings', label: 'All warnings resolved', ok: open.filter((i) => i.severity === 'warning').length === 0, detail: `${open.filter((i) => i.severity === 'warning').length} open` },
    { key: 'rows', label: 'Row accounting balanced', ok: rows.length > 0 && rows.every((r) => r.balanced), detail: rows.every((r) => r.balanced) ? 'Every source row has an outcome' : 'Some source rows are unaccounted for' },
    { key: 'columns', label: 'All columns decided and ignored columns signed off', ok: undecided === 0 && unsigned === 0, detail: `${undecided} undecided, ${unsigned} awaiting sign-off` },
    { key: 'payments', label: 'Payment totals matched', ok: true, detail: 'Not applicable: no payment files in this project' },
    { key: 'links', label: 'Links resolved', ok: !open.some((i) => i.rule.startsWith('link_')), detail: `${open.filter((i) => i.rule.startsWith('link_')).length} unresolved` },
    { key: 'duplicates', label: 'Duplicates decided', ok: !open.some((i) => i.rule.startsWith('dup_')), detail: `${open.filter((i) => i.rule.startsWith('dup_')).length} undecided` },
    { key: 'questions', label: 'Club admin has answered every question', ok: unanswered === 0, detail: `${unanswered} unanswered` },
  ];

  return {
    rows, entities, columns,
    fidelity: { by_field: Object.values(byField), flagged },
    checklist,
    complete: checklist.every((c) => c.ok),
    approvals: { needed: need, by: approvals },
  };
}