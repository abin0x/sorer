export function duplicateForIssue(job, issue) {
  return (job.staging_data?.duplicates || []).find((d) => issue.duplicate_id === d.id || issue.message === `${d.type === 'guardian' ? 'Guardian' : 'Player'} duplicate detected: ${d.match_label} (${d.records.length} records). Choose to merge, skip, or delete.`);
}
export function issueResolution(job, issue) {
  const dup = issue.type === 'duplicate' ? duplicateForIssue(job, issue) : null;
  return (dup && job.duplicate_decisions?.[dup.id]) || issue._resolution;
}
export function isOpenIssue(job, issue) {
  const resolution = issueResolution(job, issue);
  return !resolution || resolution === 'open';
}