import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export default function ExceptionRowEditor({ exception: ex, index, busy, onSave }) {
  const [editing, setEditing] = useState(false);
  const [record, setRecord] = useState({ first_name: ex.data?.player_first_name || '', last_name: ex.data?.player_last_name || '', date_of_birth: ex.data?.date_of_birth || '', team_name: ex.data?.team_name || '', guardian_email: '' });
  return <div className="rounded-lg border border-border bg-card p-3 space-y-2">
    <p className="text-xs font-semibold">Row {ex.row}: {ex.reason}</p>
    {editing && <div className="grid sm:grid-cols-2 gap-2">{Object.entries(record).map(([field, value]) => <label key={field} className="text-xs">{field.replaceAll('_', ' ')}<Input value={value} onChange={(e) => setRecord({ ...record, [field]: e.target.value })} className="h-8" /></label>)}</div>}
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={busy} onClick={() => editing ? onSave({ action: 'fix_exception', index, record }) : setEditing(true)}>{editing ? 'Save corrected player' : 'Edit row'}</Button>
      {['skip', 'delete'].map((operation) => <Button key={operation} size="sm" variant="ghost" disabled={busy} onClick={() => onSave({ action: 'fix_exception', index, operation })}>{operation}</Button>)}
      {editing && <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
    </div>
  </div>;
}