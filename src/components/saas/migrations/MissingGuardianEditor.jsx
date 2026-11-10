import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export default function MissingGuardianEditor({ issue, busy, onSave }) {
  const [editing, setEditing] = useState(false);
  const [record, setRecord] = useState({ first_name: '', last_name: '', email: '' });
  return <div className="space-y-2">
    {!editing ? <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(true)}>Fix missing guardian</Button> : <div className="space-y-2 rounded border border-border p-2">
      <p className="text-xs text-muted-foreground">This guardian was not staged because the email was missing. Correct their name and email here.</p>
      {Object.entries(record).map(([field, value]) => <Input key={field} aria-label={field} placeholder={field.replaceAll('_', ' ')} value={value} onChange={(e) => setRecord({ ...record, [field]: e.target.value })} className="h-8" />)}
      <Button size="sm" disabled={busy || Object.values(record).some((v) => !v.trim())} onClick={async () => { if (await onSave({ action: 'fix_missing_guardian', issue_index: issue._idx, record })) setEditing(false); }}>Save guardian correction</Button>
      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
    </div>}
  </div>;
}