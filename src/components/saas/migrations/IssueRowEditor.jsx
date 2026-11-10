import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ResponsiveSelect from '@/components/shared/ResponsiveSelect';
export default function IssueRowEditor({ job, issue, busy, onSave }) {
  const [editing, setEditing] = useState(false);
  const [recordKey, setRecordKey] = useState('');
  const [field, setField] = useState(issue.field || ({ ambiguous_date: 'date_of_birth', missing_email: 'email' }[issue.type]) || '');
  const [value, setValue] = useState('');
  const candidates = ['players', 'guardians'].flatMap((entity) => (job.staging_data?.[entity] || []).map((r, index) => ({ entity, index, r })).filter(({ r }) => !r._deleted && issue.row_ref === `row-${r._source_row}`));
  const selected = candidates.find((c) => `${c.entity}:${c.index}` === recordKey);
  if (!candidates.length || issue.type === 'duplicate') return null;
  return <div className="space-y-2">
    {!editing ? <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(true)}>Edit row</Button> : <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted p-2">
      <ResponsiveSelect ariaLabel="Record to edit" value={recordKey} onChange={(v) => { setRecordKey(v); setValue(''); }} placeholder="Select record" className="h-8 text-xs bg-background max-w-full" options={candidates.map((c) => ({ value: `${c.entity}:${c.index}`, label: `${c.entity}: ${c.r.first_name} ${c.r.last_name} ${c.r.email || ''}` }))} />
      <ResponsiveSelect ariaLabel="Target field" value={field} onChange={(v) => { setField(v); setValue(String(selected?.r[v] ?? '')); }} placeholder="Target field" className="h-8 text-xs bg-background" options={Object.keys(selected?.r || {}).filter((k) => !k.startsWith('_')).map((k) => ({ value: k, label: k }))} />
      <Input aria-label="Corrected value" placeholder={String(selected?.r[field] ?? 'Corrected value')} value={value} onChange={(e) => setValue(e.target.value)} className="h-8 text-xs" />
      <Button size="sm" disabled={busy || !selected || !field || !value.trim()} onClick={async () => { if (await onSave({ action: 'fix_record', entity: selected.entity, index: selected.index, field, value, issue_index: issue._idx })) setEditing(false); }}>Save correction</Button>
      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
    </div>}
  </div>;
}