import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { issueResolution, isOpenIssue } from '@/components/saas/migrations/reviewState';
export default function ResolutionHistory({ job }) {
  const issues = (job.staging_data?.issues || []).filter((i) => !isOpenIssue(job, i));
  const exceptions = (job.staging_data?.exceptions || []).filter((e) => e._resolution);
  const records = job.staging_data?.review_history || [];
  const dups = (job.staging_data?.duplicates || []).filter((d) => job.duplicate_decisions?.[d.id]);
  if (!issues.length && !exceptions.length && !records.length && !dups.length) return null;
  return <details className="rounded-xl border border-primary/25 bg-primary/5 p-3">
    <summary className="cursor-pointer text-sm font-semibold text-primary">Resolved history: {issues.length} issues, {dups.length} duplicate groups, {exceptions.length} exceptions</summary>
    <div className="mt-3 max-h-60 overflow-auto space-y-2">
      {issues.map((i, idx) => <div key={`i-${idx}`} className="text-xs flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0 text-primary" /><div><p>{i.message}</p><p className="font-semibold text-primary">{i._resolution_method || issueResolution(job, i)}{i._resolved_by ? ` · ${i._resolved_by}` : ''}{i._resolved_at ? ` · ${new Date(i._resolved_at).toLocaleString()}` : ''}</p></div></div>)}
      {dups.map((d) => <p key={d.id} className="text-xs">{d.match_label}: <strong>{job.duplicate_decisions[d.id]}</strong></p>)}
      {exceptions.map((e, idx) => <p key={`e-${idx}`} className="text-xs">Row {e.row}: <strong>{e._resolution}</strong> · {e._resolved_by}</p>)}
      {records.map((r, idx) => <p key={`r-${idx}`} className="text-xs">{r.entity} row {Number.isInteger(r.row) ? r.row + 1 : '—'}: <strong>{r.method}</strong> · {r.by} · {new Date(r.at).toLocaleString()}</p>)}
    </div>
  </details>;
}