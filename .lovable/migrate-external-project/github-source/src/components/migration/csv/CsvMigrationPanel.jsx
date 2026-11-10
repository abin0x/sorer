import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import MigrationProgress from '@/components/migration/MigrationProgress';
import CsvRowsTable from '@/components/migration/csv/CsvRowsTable';
import CsvBatchSettings from '@/components/migration/csv/CsvBatchSettings';
import useCsvRunner from '@/components/migration/csv/useCsvRunner';
export default function CsvMigrationPanel({ job: initialJob, reviewer = false, onChanged }) {
  const client = useQueryClient(), key = ['csvMigration', initialJob.id];
  const [notes, setNotes] = useState(initialJob.specialist_notes || ''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const { data } = useQuery({ queryKey: key, initialData: initialJob, queryFn: async () => (await base44.functions.invoke('migrationCsv', { action: 'progress', migrationJobId: initialJob.id })).data.job, refetchInterval: 4000 });
  const job = data || initialJob, staging = job.commit_progress.phase === 'staging';
  const update = next => { client.setQueryData(key, next); if (next.status !== job.status) onChanged?.(next); };
  const enabled = job.status === 'processing' && (staging || reviewer);
  const runner = useCsvRunner(job, enabled, update);
  const act = async action => { setBusy(true); setError(''); try { const { data } = await base44.functions.invoke('migrationCsv', { action, migrationJobId: job.id, notes }); update(data.job); } catch (e) { setError(e?.response?.data?.error || e.message); } finally { setBusy(false); } };
  return <div className="space-y-4"><MigrationProgress job={job} />
    {(error || runner.error) && <p role="alert" className="text-sm text-destructive">{error || runner.error}</p>}
    {enabled && <div className="flex gap-2"><Button disabled={runner.running} onClick={runner.start}>Continue remaining rows</Button>{runner.running && <Button variant="outline" onClick={runner.stop}>Pause after this batch</Button>}</div>}
    {job.status === 'processing' && <p className="text-xs text-muted-foreground">Keep this panel open to run batches. Progress is saved between requests; reopening resumes it. One request runs at a time, with an extra pause after every three batches.</p>}
    {!staging && <CsvRowsTable job={job} />}
    {job.specialist_notes && <p className="text-sm text-muted-foreground">Migration expert: {job.specialist_notes}</p>}
    {!reviewer && ['client_review', 'needs_fixes'].includes(job.status) && <Button disabled={busy} onClick={() => act('submit')}>Submit for migration expert review</Button>}
    {reviewer && <CsvBatchSettings />}
    {reviewer && ['client_review', 'support_review'].includes(job.status) && <><Textarea aria-label="Migration expert note" value={notes} onChange={e => setNotes(e.target.value)} /><div className="flex gap-2"><Button disabled={busy} onClick={() => act('approve')}>Approve & Go Live</Button><Button variant="outline" disabled={busy} onClick={() => act('send_back')}>Send back for fixes</Button></div></>}
  </div>;
}