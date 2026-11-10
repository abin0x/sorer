import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
export default function CsvBatchSettings() {
  const [size, setSize] = useState(200), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const { data } = useQuery({ queryKey: ['migrationBatchSize'], queryFn: async () => (await base44.functions.invoke('migrationCsv', { action: 'get_settings' })).data });
  useEffect(() => { if (data) setSize(data.batch_size); }, [data]);
  const save = async e => { e.preventDefault(); setBusy(true); try { await base44.functions.invoke('migrationCsv', { action: 'save_settings', batch_size: Number(size) }); setMessage('Saved. Applies to the next batch of every migration.'); } catch (e) { setMessage(e?.response?.data?.error || e.message); } finally { setBusy(false); } };
  return <form onSubmit={save} className="border border-border rounded-lg p-3 space-y-2"><label className="text-xs font-semibold">Global rows per batch (1–200)</label><div className="flex gap-2"><Input aria-label="Global migration batch size" type="number" min="1" max="200" value={size} onChange={e => setSize(e.target.value)} /><Button disabled={busy} type="submit">Save</Button></div><p className="text-xs text-muted-foreground">Tune after 1k, 5k, 20k and 50k-row load tests. Changing the size never changes saved cursors.</p>{message && <p role="status" className="text-xs">{message}</p>}</form>;
}