import React, { useState } from 'react';
import { Loader2, CheckCircle2, UserCog, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { issueManage, SEVERITY_COLORS, STATUS_COLORS } from '@/lib/systemHealthApi';

export default function IssuesPanel({ issues, onChanged }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(null); // issue id being acted on
  const [resolveId, setResolveId] = useState(null);
  const [fixNotes, setFixNotes] = useState('');

  const act = async (id, payload, msg) => {
    setBusy(id);
    try { await issueManage({ issue_id: id, ...payload }); toast({ title: msg }); onChanged(); }
    catch (e) { toast({ title: e.message, variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  const doResolve = async (id) => { await act(id, { action: 'resolve', fix_notes: fixNotes }, 'Issue resolved — linked tickets notified'); setResolveId(null); setFixNotes(''); };

  if (!issues?.length) return <p className="text-sm text-muted-foreground py-6 text-center">No open issues. Everything looks good.</p>;

  return (
    <ul className="space-y-2">
      {issues.map((i) => (
        <li key={i.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
          <div className="flex flex-wrap items-start gap-2 justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={SEVERITY_COLORS[i.severity]}>{i.severity}</Badge>
                <Badge className={STATUS_COLORS[i.status] || 'bg-slate-100 text-slate-600'}>{i.status}</Badge>
                <span className="text-xs text-muted-foreground">{i.signal_type.replace(/_/g, ' ')}</span>
                {i.club_name && <span className="text-xs text-muted-foreground">· {i.club_name}</span>}
              </div>
              <p className="font-medium mt-1">{i.title}</p>
              {i.description && <p className="text-sm text-muted-foreground line-clamp-2">{i.description}</p>}
              <p className="text-xs text-muted-foreground mt-1">Seen {i.count}× · last {new Date(i.last_seen).toLocaleString()}{i.linked_ticket_ids?.length ? ` · ${i.linked_ticket_ids.length} ticket${i.linked_ticket_ids.length > 1 ? 's' : ''}` : ''}{i.owner ? ` · owner ${i.owner}` : ''}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" disabled={busy === i.id} onClick={() => act(i.id, { action: 'assign', owner: undefined }, 'Assigned to you')}><UserCog className="w-3.5 h-3.5" /> Take</Button>
              <Button size="sm" disabled={busy === i.id} onClick={() => { setResolveId(resolveId === i.id ? null : i.id); setFixNotes(i.fix_notes || ''); }}><CheckCircle2 className="w-3.5 h-3.5" /> Resolve</Button>
            </div>
          </div>
          {resolveId === i.id && (
            <div className="space-y-2 pt-1">
              <Textarea rows={2} value={fixNotes} onChange={(e) => setFixNotes(e.target.value)} placeholder="What was the fix? (posted to linked tickets)" />
              <div className="flex gap-2">
                <Button size="sm" disabled={busy === i.id} onClick={() => doResolve(i.id)}>{busy === i.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Confirm resolve</Button>
                <Button size="sm" variant="ghost" onClick={() => setResolveId(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}