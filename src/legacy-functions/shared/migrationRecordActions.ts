// @ts-nocheck
import { markIssue, recordReview, resolveRecordIssues } from './migrationReviewState.ts';
import { parseDate, normalizeGender, normalizeEmail } from './migrationCleaning.ts';
export function applyRecordAction(job, body, user) {
  const staging = JSON.parse(JSON.stringify(job.staging_data || {}));
  const { entity, operation, indices } = body;
  if (!['players', 'guardians', 'teams'].includes(entity) || !['skip', 'ignore', 'delete', 'restore'].includes(operation) || !Array.isArray(indices) || !indices.length) throw new Error('Select records and a valid action');
  const arr = entity === 'teams' && job.team_sheet?.length ? JSON.parse(JSON.stringify(job.team_sheet)) : (staging[entity] || []);
  if (indices.some((i) => !Number.isInteger(i) || i < 0 || i >= arr.length)) throw new Error('Record not found');
  for (const index of new Set(indices)) {
    const record = arr[index];
    if (operation !== 'ignore') { record._excluded = operation !== 'restore'; record._deleted = operation === 'delete'; }
    recordReview(staging, entity, record, ({ skip: 'Skipped from import', ignore: 'Issues ignored, record retained', delete: 'Deleted from import', restore: 'Restored' })[operation], user);
    if (operation !== 'restore') resolveRecordIssues(staging, entity, record, user, record._review_method);
  }
  return { staging_data: staging, ...(entity === 'teams' && job.team_sheet?.length ? { team_sheet: arr } : {}) };
}
export function fixMissingGuardian(job, body, user) {
  const staging = JSON.parse(JSON.stringify(job.staging_data || {}));
  const issue = staging.issues?.[body.issue_index];
  if (!issue || issue.type !== 'missing_email' || !/^row-\d+$/.test(issue.row_ref || '')) throw new Error('Missing guardian issue not found');
  const record = body.record || {};
  const email = normalizeEmail(record.email || '');
  if (!record.first_name?.trim() || !record.last_name?.trim() || !email.ok || !email.value) throw new Error('A full guardian name and valid email are required');
  const row = Number(issue.row_ref.slice(4));
  const guardians = staging.guardians ||= [];
  let guardian = guardians.find((g) => !g._excluded && g.email?.toLowerCase() === email.value.toLowerCase());
  if (!guardian) { guardian = { first_name: record.first_name.trim(), last_name: record.last_name.trim(), email: email.value, _source_row: row, _issues: [], _added_by_specialist: true }; guardians.push(guardian); }
  if (issue.message?.includes('Guardian 1')) for (const player of staging.players || []) if (player._source_row === row) player.guardian_email = email.value;
  recordReview(staging, 'guardians', guardian, 'Corrected missing guardian email', user);
  markIssue(issue, 'resolved', user, 'Guardian name and email corrected');
  return { staging_data: staging };
}
export function fixException(job, body, user) {
  const staging = JSON.parse(JSON.stringify(job.staging_data || {}));
  const ex = staging.exceptions?.[body.index];
  if (!ex) throw new Error('Exception not found');
  if (body.operation === 'skip' || body.operation === 'delete') {
    ex._resolution = body.operation;
  } else {
    const r = body.record || {};
    const dob = parseDate(r.date_of_birth || '');
    const email = normalizeEmail(r.guardian_email || '');
    if (!r.first_name?.trim() || !r.last_name?.trim() || !dob.ok || !email.ok || !email.value) throw new Error('A full name, valid date of birth and guardian email are required');
    if (!(staging.guardians || []).some((g) => !g._excluded && g.email?.toLowerCase() === email.value.toLowerCase())) throw new Error('Add this guardian in Records first, or use an existing guardian email');
    (staging.players ||= []).push({ ...r, date_of_birth: dob.value, gender: normalizeGender(r.gender || ''), guardian_email: email.value, _source_row: ex.row - 1, _issues: [] });
    ex._resolution = 'corrected';
  }
  ex._resolved_by = user.full_name || user.email;
  ex._resolved_at = new Date().toISOString();
  for (const issue of staging.issues || []) if (issue.row_ref === `row-${ex.row - 1}` && ['missing_required', 'ambiguous_date'].includes(issue.type)) markIssue(issue, 'resolved', user, `Exception ${ex._resolution}`);
  return { staging_data: staging };
}