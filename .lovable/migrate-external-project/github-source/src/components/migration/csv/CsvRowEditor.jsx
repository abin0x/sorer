import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
const EXTRA = { members: ['player_first_name', 'player_last_name', 'date_of_birth', 'p1_name', 'p1_email', 'p2_name', 'p2_email', 'team_name'], teams: ['name', 'age_group', 'gender', 'playing_format', 'season'] };
export default function CsvRowEditor({ row, jobId, onClose, onSaved }) {
  const [values, setValues] = useState(row.raw_data || {}), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const fields = [...new Set([...(EXTRA[row.file_key] || []), ...Object.keys(values)])];
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await base44.functions.invoke('migrationCsv', { action: 'edit_row', migrationJobId: jobId, row_id: row.id, raw_data: values }); onSaved(); onClose(); }
    catch (e) { setError(e?.response?.data?.error || e.message); } finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[85vh] overflow-auto"><DialogHeader><DialogTitle>Edit CSV row {row.row_number}</DialogTitle></DialogHeader>
    <form onSubmit={save} className="space-y-3"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{fields.map(field => <label key={field} className="text-xs text-muted-foreground space-y-1 block"><span>{field.replace(/_/g, ' ')}</span><Input value={String(values[field] ?? '')} onChange={e => setValues({ ...values, [field]: e.target.value })} /></label>)}</div>
    {row.file_key === 'teams' && <p className="text-xs text-muted-foreground">Formats: 4v4, 7v7, 9v9 or 11v11. Gender: Boys, Girls or Boys and Girls.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={busy} type="submit">{busy ? 'Saving…' : 'Save and validate'}</Button></form>
  </DialogContent></Dialog>;
}