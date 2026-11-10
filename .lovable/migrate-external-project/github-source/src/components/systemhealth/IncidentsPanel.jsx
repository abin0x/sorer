import React, { useState } from 'react';
import { Loader2, Megaphone, CheckCircle2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { incidentManage, SEVERITY_COLORS, STATUS_COLORS } from '@/lib/systemHealthApi';

export default function IncidentsPanel({ incidents, onChanged }) {
  const { toast } = useToast();
  const [declaring, setDeclaring] = useState(false);
  const [updateId, setUpdateId] = useState(null);
  const [updateMsg, setUpdateMsg] = useState('');
  const [busy, setBusy] = useState(null);

  const act = async (payload, msg) => { setBusy(true); try { await incidentManage(payload); toast({ title: msg }); setUpdateId(null); setUpdateMsg(''); onChanged(); } catch (e) { toast({ title: e.message, variant: 'destructive' }); } finally { setBusy(false); } };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{incidents?.length || 0} active incident{(incidents?.length || 0) === 1 ? '' : 's'}</p>
        <Button size="sm" onClick={() => setDeclaring(true)}><Plus className="w-4 h-4" /> Declare incident</Button>
      </div>

      {!incidents?.length && <p className="text-sm text-muted-foreground py-6 text-center">No active incidents.</p>}

      <ul className="space-y-2">
        {incidents?.map((inc) => (
          <li key={inc.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={SEVERITY_COLORS[inc.severity]}>{inc.severity}</Badge>
                  <Badge className={STATUS_COLORS[inc.status] || ''}>{inc.status}</Badge>
                  {inc.show_banner && <Badge variant="secondary"><Megaphone className="w-3 h-3 mr-1" /> Banner on</Badge>}
                </div>
                <p className="font-medium mt-1">{inc.name}</p>
                <p className="text-xs text-muted-foreground">{inc.affected_club_names?.length ? inc.affected_club_names.join(', ') : 'All clubs'} · started {new Date(inc.start_time).toLocaleString()}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setUpdateId(updateId === inc.id ? null : inc.id)}>Update</Button>
                <Button size="sm" variant="ghost" onClick={() => act({ action: 'toggle_banner', incident_id: inc.id, show_banner: !inc.show_banner }, inc.show_banner ? 'Banner hidden' : 'Banner shown')}>{inc.show_banner ? 'Hide banner' : 'Show banner'}</Button>
                <Button size="sm" disabled={busy} onClick={() => act({ action: 'resolve', incident_id: inc.id }, 'Incident resolved')}><CheckCircle2 className="w-3.5 h-3.5" /> Resolve</Button>
              </div>
            </div>
            {inc.updates?.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-1 pl-3 border-l-2 border-border">
                {inc.updates.slice(-3).reverse().map((u, idx) => <li key={idx}><span className="font-medium">{u.status}</span> — {u.message} <span className="opacity-60">({new Date(u.timestamp).toLocaleTimeString()})</span></li>)}
              </ul>
            )}
            {updateId === inc.id && (
              <div className="space-y-2">
                <Textarea rows={2} value={updateMsg} onChange={(e) => setUpdateMsg(e.target.value)} placeholder="Update message for affected clubs" />
                <Button size="sm" disabled={busy || !updateMsg} onClick={() => act({ action: 'update', incident_id: inc.id, message: updateMsg }, 'Update posted')}>{busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Post update</Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <DeclareIncidentDialog open={declaring} onClose={() => setDeclaring(false)} onDeclared={() => { setDeclaring(false); onChanged(); }} />
    </div>
  );
}

function DeclareIncidentDialog({ open, onClose, onDeclared }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [severity, setSeverity] = useState('P2');
  const [banner, setBanner] = useState('');
  const [notify, setNotify] = useState(false);
  const [busy, setBusy] = useState(false);

  const declare = async () => {
    if (!name) return;
    setBusy(true);
    try { await incidentManage({ action: 'declare', name, severity, banner_message: banner, notify_club_admins: notify }); toast({ title: 'Incident declared' }); onDeclared(); }
    catch (e) { toast({ title: e.message, variant: 'destructive' }); }
    finally { setBusy(false); setName(''); setBanner(''); setNotify(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Declare incident</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Payment processing degraded" /></div>
          <div><Label className="text-xs">Severity</Label>
            <Select value={severity} onValueChange={setSeverity}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['P1', 'P2', 'P3', 'P4'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Banner message (shown in app + /help)</Label><Textarea rows={2} value={banner} onChange={(e) => setBanner(e.target.value)} placeholder="We are investigating an issue with..." /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Email affected club admins</label>
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={busy || !name} onClick={declare}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Declare</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}