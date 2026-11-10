import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import CsvRowEditor from '@/components/migration/csv/CsvRowEditor';
export default function CsvRowsTable({ job }) {
  const [page, setPage] = useState(0), [issues, setIssues] = useState(false), [editing, setEditing] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const client = useQueryClient(), key = ['csvRows', job.id, job.commit_progress.generation];
  const { data, isFetching, error: readError } = useQuery({ queryKey: [...key, page, issues], queryFn: async () => (await base44.functions.invoke('migrationCsv', { action: 'rows', migrationJobId: job.id, skip: page * 50, limit: 50, issues_only: issues })).data });
  const editable = ['client_review', 'support_review', 'needs_fixes'].includes(job.status);
  const refresh = () => client.invalidateQueries({ queryKey: key });
  const exclude = async (row) => {
    setBusy(true); setError('');
    try { await base44.functions.invoke('migrationCsv', { action: 'edit_row', migrationJobId: job.id, row_id: row.id, excluded: !row.excluded }); refresh(); }
    catch (e) { setError(e?.response?.data?.error || e.message); } finally { setBusy(false); }
  };
  return <div className="space-y-3"><div className="flex gap-2"><Button variant={issues ? 'outline' : 'default'} size="sm" onClick={() => { setIssues(false); setPage(0); }}>All rows</Button><Button variant={issues ? 'default' : 'outline'} size="sm" onClick={() => { setIssues(true); setPage(0); }}>Rows with issues</Button></div>
    <p className="text-xs text-muted-foreground">Guardians with the same email and players with the same source ID are merged through stable import keys. Exclude a source row to omit it from Go-Live.</p>
    {(error || readError) && <p role="alert" className="text-sm text-destructive">{error || readError.message}</p>}
    {isFetching ? <p role="status">Loading rows…</p> : !data?.rows?.length ? <p className="py-5 text-sm text-muted-foreground">No rows on this page.</p> : <div className="overflow-x-auto border border-border rounded-lg"><table className="w-full text-xs"><thead className="bg-muted"><tr>{['File / row', 'Player or team', 'Guardian email', 'Review status', 'Actions'].map(h => <th key={h} className="p-2 text-left">{h}</th>)}</tr></thead><tbody>{data.rows.map(row => <tr key={row.id} className="border-t border-border"><td className="p-2">{row.file_key} / {row.row_number}</td><td className="p-2">{row.raw_data?.name || `${row.raw_data?.player_first_name || ''} ${row.raw_data?.player_last_name || ''}`}</td><td className="p-2">{row.raw_data?.p1_email || '—'}</td><td className="p-2 max-w-sm">{row.excluded ? 'Excluded' : row.errors?.length ? row.errors.join(' ') : 'Ready'}</td><td className="p-2">{editable && <div className="flex gap-1"><Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(row)}>Edit</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => exclude(row)}>{row.excluded ? 'Restore' : 'Exclude'}</Button></div>}</td></tr>)}</tbody></table></div>}
    <div className="flex items-center justify-between gap-2 text-xs"><Button variant="outline" size="sm" disabled={!page || isFetching} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page + 1} • {data?.rows?.length || 0} rows shown</span><Button variant="outline" size="sm" disabled={!data?.has_more || isFetching} onClick={() => setPage(page + 1)}>Next</Button></div>
    {editing && <CsvRowEditor key={editing.id} row={editing} jobId={job.id} onClose={() => setEditing(null)} onSaved={refresh} />}
  </div>;
}