import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
export default function DuplicateReviewList({ duplicates, busy, onSave }) {
  const [selected, setSelected] = useState([]);
  if (!duplicates.length) return null;
  const actions = ['merge', 'skip', 'delete'];
  return <div className="space-y-2">
    <p className="text-sm font-semibold">{duplicates.length} unresolved duplicate groups</p>
    <p className="text-xs text-muted-foreground">Merge fills empty fields in the first record. Skip excludes the entire group. Delete retains the first record and removes its duplicates from import.</p>
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs flex gap-1"><input type="checkbox" checked={duplicates.every((d) => selected.includes(d.id))} onChange={(e) => setSelected(e.target.checked ? duplicates.map((d) => d.id) : [])} />Select all</label>
      {actions.map((decision) => <Button key={decision} size="sm" variant="outline" disabled={busy} onClick={async () => { await onSave({ action: 'bulk_resolve_duplicates', decision, ...(selected.length ? { duplicate_ids: selected } : {}) }); setSelected([]); }}>{decision} {selected.length ? `${selected.length} selected` : 'all'}</Button>)}
    </div>
    <div className="max-h-80 overflow-auto space-y-2">{duplicates.map((dup) => <div key={dup.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={selected.includes(dup.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, dup.id] : selected.filter((id) => id !== dup.id))} /><Badge variant="outline">{dup.type}</Badge>{dup.match_label}</label>
      {dup.records.map((r, j) => <p key={j} className="text-xs text-muted-foreground">Row {r.source_row + 1}: {r.display}</p>)}
      <div className="flex gap-2">{actions.map((decision) => <Button key={decision} size="sm" variant="outline" disabled={busy} onClick={() => onSave({ action: 'resolve_duplicate', duplicate_id: dup.id, decision })}>{decision}</Button>)}</div>
    </div>)}</div>
  </div>;
}