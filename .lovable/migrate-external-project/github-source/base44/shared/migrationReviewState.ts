export function syncDuplicateIssues(staging, decisions) {
  for (const issue of staging.issues || []) {
    if (issue.type !== 'duplicate') continue;
    const dup = (staging.duplicates || []).find((d) => issue.duplicate_id === d.id || issue.message === `${d.type === 'guardian' ? 'Guardian' : 'Player'} duplicate detected: ${d.match_label} (${d.records.length} records). Choose to merge, skip, or delete.`);
    if (dup && decisions[dup.id]) {
      issue.duplicate_id = dup.id;
      issue._resolution = decisions[dup.id];
      issue._resolution_method = `Duplicate: ${decisions[dup.id]}`;
    }
  }
  return staging;
}
export function markIssue(issue, resolution, user, method = resolution) {
  issue._resolution = resolution;
  issue._resolution_method = method;
  issue._resolved_by = user.full_name || user.email;
  issue._resolved_at = new Date().toISOString();
}
export function recordReview(staging, entity, record, method, user) {
  record._review_method = method;
  record._reviewed_by = user.full_name || user.email;
  record._reviewed_at = new Date().toISOString();
  (staging.review_history ||= []).push({ entity, row: record._source_row, method, by: record._reviewed_by, at: record._reviewed_at });
}
export function resolveRecordIssues(staging, entity, record, user, method, field = null) {
  const sourceRef = `row-${record._source_row}`;
  for (const issue of staging.issues || []) {
    if (issue.type === 'duplicate' || issue.row_ref !== sourceRef) continue;
    const inferred = issue.field || ({ ambiguous_date: 'date_of_birth', missing_email: 'email' }[issue.type]);
    if (field && inferred !== field) continue;
    if (issue.type === 'missing_email' && field) continue;
    markIssue(issue, 'resolved', user, method);
  }
}