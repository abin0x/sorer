import React from 'react';
import { Loader2, AlertTriangle, PauseCircle, CheckCircle2 } from 'lucide-react';
export default function MigrationProgress({ job, progress = job?.commit_progress || {} }) {
  const legacy = progress.pipeline !== 'csv_rows';
  const processed = legacy ? Object.values(progress.imported || {}).reduce((n, v) => n + Number(v || 0), 0) : progress.phase === 'staging' || progress.phase === 'review' ? progress.source_processed || 0 : progress.commit_cursor || 0;
  const total = legacy ? Object.values(progress.total || {}).reduce((n, v) => n + Number(v || 0), 0) : progress.source_total;
  const paused = !!progress.last_error || progress.state === 'error';
  const finished = job?.status === 'completed' || progress.phase === 'done';
  const heartbeat = progress.updated_at && Date.now() - Date.parse(progress.updated_at) < 20000;
  const active = !paused && !finished && job?.status === 'processing' && (progress.lease?.until > Date.now() || heartbeat && progress.state === 'running');
  const label = finished ? 'Completed' : paused ? progress.retryable ? 'Paused for error • automatic retry' : 'Paused for error • needs attention' : active ? 'Running' : progress.phase === 'review' ? 'Ready for review' : 'Waiting to resume';
  const Icon = paused ? AlertTriangle : finished ? CheckCircle2 : active ? Loader2 : PauseCircle;
  const size = progress.batch_size || 200, batch = progress.batch_count ?? Math.floor(processed / size);
  const percent = total ? Math.min(100, Math.floor(processed / total * 100)) : 0;
  return <section aria-label="Migration progress" className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
    <div className="flex justify-between gap-3 text-sm font-semibold"><span className={`flex items-center gap-2 ${paused ? 'text-destructive' : 'text-foreground'}`}><Icon className={`w-4 h-4 ${active ? 'animate-spin' : ''}`} />{label}</span><span>{total ? `${percent}%` : 'Counting rows'}</span></div>
    <div role="progressbar" aria-valuemin={0} aria-valuemax={total || undefined} aria-valuenow={processed} aria-valuetext={`${processed} rows processed`} className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full ${paused ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${percent}%` }} /></div>
    <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span><strong className="text-foreground">{processed.toLocaleString()}</strong>{total != null ? ` / ${Number(total).toLocaleString()}` : ''} {legacy ? 'records' : 'source rows'} processed</span><span>Batch {batch.toLocaleString()} completed • {size} rows per batch</span></div>
    <p className="text-xs text-muted-foreground">{progress.phase === 'staging' ? 'Parsing and staging CSV' : progress.phase === 'links' ? 'Finishing family and team links' : legacy ? `Importing ${progress.phase || 'records'}` : progress.phase === 'review' ? 'Staging complete; no live records imported yet' : 'Importing approved rows'}{progress.last_batch_rows != null ? ` • Last batch: ${progress.last_batch_rows} rows` : ''}</p>
    {progress.last_error && <p role="alert" className="text-xs text-destructive break-words">{progress.last_error}</p>}
  </section>;
}