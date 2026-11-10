import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Search, Send, Ban, Reply, CheckCircle, X, MessageSquare } from "lucide-react";

const STATUS_COLORS = {
  new: 'bg-slate-100 text-slate-700',
  contacted: 'bg-blue-100 text-blue-700',
  opened: 'bg-indigo-100 text-indigo-700',
  clicked: 'bg-purple-100 text-purple-700',
  replied: 'bg-emerald-100 text-emerald-700',
  booked: 'bg-green-100 text-green-700',
  not_interested: 'bg-gray-100 text-gray-500',
  bounced: 'bg-red-100 text-red-700',
  unsubscribed: 'bg-red-200 text-red-800',
};

export default function OutreachProspects() {
  const [prospects, setProspects] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', search: '', source: '' });
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [templates, setTemplates] = useState([]);

  const load = async (reset = false) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('outreach-prospects', {
        action: 'list',
        ...filters,
        limit: 50,
        cursor: reset ? undefined : cursor,
      });
      const data = res.data;
      setProspects(reset ? data.items : [...prospects, ...data.items]);
      setTotal(data.total || 0);
      setCursor(data.next_cursor);
      setHasMore(data.has_more);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(true); }, [filters.status, filters.source]);

  const openDetail = async (id) => {
    try {
      const res = await base44.functions.invoke('outreach-prospects', { action: 'get', id });
      setSelected(res.data);
    } catch (e) { console.error(e); }
  };

  const loadTemplates = async () => {
    const res = await base44.functions.invoke('outreach-templates', { action: 'list' });
    setTemplates(res.data.items || []);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Search name, club, email…" className="pl-9"
            value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && load(true)} />
        </div>
        <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v })}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All statuses</SelectItem>
            {Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => load(true)} variant="outline">Refresh</Button>
        <Button onClick={() => { setShowCreate(true); }} className="gap-1"><Plus className="w-4 h-4" /> New Prospect</Button>
      </div>

      <p className="text-sm text-slate-500">{total} prospects</p>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Name', 'Title', 'Club', 'Branches', 'Status', 'Last Contacted', 'Owner'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prospects.map(p => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => openDetail(p.id)}>
                  <td className="px-3 py-2 font-medium text-slate-900">{p.first_name} {p.last_name}</td>
                  <td className="px-3 py-2 text-slate-600">{p.title || '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{p.club_name}</td>
                  <td className="px-3 py-2 text-slate-600">{p.branch_count || '—'}</td>
                  <td className="px-3 py-2"><Badge className={STATUS_COLORS[p.status] || ''}>{p.status}</Badge></td>
                  <td className="px-3 py-2 text-slate-500">{p.last_contacted_at ? new Date(p.last_contacted_at).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-2 text-slate-500">{p.owner_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {prospects.length === 0 && !loading && <p className="p-8 text-center text-slate-400">No prospects found.</p>}
        </CardContent>
      </Card>

      {hasMore && <Button onClick={() => load(false)} variant="outline" className="w-full">Load more</Button>}

      {/* Create dialog */}
      {showCreate && <CreateProspectDialog onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(true); }} />}

      {/* Detail drawer */}
      {selected && (
        <ProspectDetailDrawer data={selected} onClose={() => setSelected(null)}
          onAction={async (action, params) => {
            await base44.functions.invoke('outreach-prospects', { action, id: selected.prospect.id, ...params });
            openDetail(selected.prospect.id);
          }}
          onSend={() => { loadTemplates(); setShowSend(true); }}
          onLogReply={() => setShowReply(true)}
        />
      )}

      {/* Log reply dialog */}
      {showReply && selected && (
        <LogReplyDialog prospect={selected.prospect}
          onClose={() => setShowReply(false)}
          onClassified={() => { setShowReply(false); openDetail(selected.prospect.id); load(true); }}
        />
      )}

      {/* Send dialog */}
      {showSend && selected && (
        <SendEmailDialog prospect={selected.prospect} templates={templates}
          onClose={() => setShowSend(false)}
          onSent={() => { setShowSend(false); openDetail(selected.prospect.id); }} />
      )}
    </div>
  );
}

function CreateProspectDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', title: '', club_name: '', email: '', region: '', branch_count: '', source: 'manual' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('outreach-prospects', { action: 'create', ...form, branch_count: form.branch_count ? Number(form.branch_count) : null });
      onCreated();
    } catch (e) { alert(e.response?.data?.error || e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Prospect</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>First Name *</Label><Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></div>
          <div><Label>Last Name *</Label><Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></div>
          <div className="col-span-2"><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div className="col-span-2"><Label>Club Name *</Label><Input value={form.club_name} onChange={e => setForm({ ...form, club_name: e.target.value })} /></div>
          <div className="col-span-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Region</Label><Input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} /></div>
          <div><Label>Branches</Label><Input type="number" value={form.branch_count} onChange={e => setForm({ ...form, branch_count: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.first_name || !form.last_name || !form.email || !form.club_name}>
            {saving ? 'Saving…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProspectDetailDrawer({ data, onClose, onAction, onSend, onLogReply }) {
  const { prospect, sends, enrollments } = data;
  const [note, setNote] = useState('');

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{prospect.first_name} {prospect.last_name}</h2>
            <p className="text-sm text-slate-500">{prospect.title} · {prospect.club_name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button size="sm" className="gap-1" onClick={onSend}><Send className="w-3.5 h-3.5" /> Send Email</Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={onLogReply}><MessageSquare className="w-3.5 h-3.5" /> Log Reply</Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => onAction('mark_replied')}><Reply className="w-3.5 h-3.5" /> Mark Replied</Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => onAction('mark_booked')}><CheckCircle className="w-3.5 h-3.5" /> Mark Booked</Button>
          <Button size="sm" variant="destructive" className="gap-1" onClick={() => onAction('suppress')}><Ban className="w-3.5 h-3.5" /> Suppress</Button>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="sequences">Sequences</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-2 mt-3">
            <Detail label="Email" value={prospect.email} />
            <Detail label="Phone" value={prospect.region} />
            <Detail label="Branches" value={prospect.branch_count || '—'} />
            <Detail label="Players" value={prospect.player_count || '—'} />
            <Detail label="Platform" value={prospect.registration_platform} />
            <Detail label="Source" value={prospect.source} />
            <Detail label="Status" value={<Badge className={STATUS_COLORS[prospect.status]}>{prospect.status}</Badge>} />
            <Detail label="Suppressed" value={prospect.suppressed ? 'Yes' : 'No'} />
            <Detail label="Pain Signal" value={prospect.pain_signal || '—'} />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-2 mt-3">
            {sends?.length === 0 && <p className="text-sm text-slate-400">No sends yet.</p>}
            {sends?.map(s => (
              <div key={s.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900">{s.subject}</span>
                  <Badge className={s.is_one_off ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}>{s.is_one_off ? 'One-off' : 'Sequence'}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(s.sent_at).toLocaleString()} · {s.status} · Opens: {s.open_count} · Clicks: {s.click_count}
                </p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="sequences" className="space-y-2 mt-3">
            {enrollments?.length === 0 && <p className="text-sm text-slate-400">Not enrolled in any sequences.</p>}
            {enrollments?.map(e => (
              <div key={e.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="text-sm font-medium text-slate-900">{e.sequence_name}</p>
                <p className="text-xs text-slate-500">Step {e.current_step_order} · {e.status} · Next: {e.next_send_at ? new Date(e.next_send_at).toLocaleString() : '—'}</p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="notes" className="space-y-2 mt-3">
            <div className="flex gap-2">
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note…" />
              <Button size="sm" onClick={async () => {
                await onAction('add_note', { text: note });
                setNote('');
              }}>Add</Button>
            </div>
            {prospect.notes_history?.map((n, i) => (
              <div key={i} className="p-2 rounded-lg bg-slate-50">
                <p className="text-sm text-slate-700">{n.text}</p>
                <p className="text-xs text-slate-400 mt-1">{n.author_name} · {new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between py-1 border-b border-slate-100">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 text-right">{value}</span>
    </div>
  );
}

function LogReplyDialog({ prospect, onClose, onClassified }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const classify = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('outreach-reply', { action: 'classify', prospect_id: prospect.id, body });
      setResult(res.data);
    } catch (e) { alert(e.response?.data?.error || e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Log & classify reply from {prospect.first_name} {prospect.last_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Paste the reply text. AI will classify it (interested / question / not interested / OOO), update the prospect, pause any active sequence, and notify you on hot replies.</p>
          <Textarea rows={6} value={body} onChange={e => setBody(e.target.value)} placeholder="Paste the reply email body…" />
          {result && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm"><b>Intent:</b> <Badge className="bg-indigo-100 text-indigo-700">{result.intent}</Badge></p>
              <p className="text-sm text-slate-600 mt-1">{result.summary}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {result
            ? <Button onClick={onClassified}>Done</Button>
            : <Button onClick={classify} disabled={busy || !body.trim()}>{busy ? 'Classifying…' : 'Classify reply'}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SendEmailDialog({ prospect, templates, onClose, onSent }) {
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const useTemplate = async (id) => {
    setTemplateId(id);
    if (id) {
      const res = await base44.functions.invoke('outreach-templates', { action: 'render', template_id: id, prospect_id: prospect.id });
      if (res.data.rendered) {
        setSubject(res.data.rendered.subject);
        setBody(res.data.rendered.html);
      }
    }
  };

  const send = async () => {
    setSending(true);
    try {
      await base44.functions.invoke('outreach-send', {
        action: 'one_off',
        prospect_id: prospect.id,
        template_id: templateId || undefined,
        subject: templateId ? undefined : subject,
        body_html: templateId ? undefined : body,
      });
      onSent();
    } catch (e) { alert(e.response?.data?.error || e.message); } finally { setSending(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Send Email to {prospect.first_name} {prospect.last_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Template</Label>
            <Select value={templateId} onValueChange={useTemplate}>
              <SelectTrigger><SelectValue placeholder="Choose a template or write inline" /></SelectTrigger>
              <SelectContent>
                {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {!templateId && (
            <>
              <div><Label>Subject</Label><Input value={subject} onChange={e => setSubject(e.target.value)} /></div>
              <div><Label>Body (HTML)</Label><Textarea rows={6} value={body} onChange={e => setBody(e.target.value)} /></div>
            </>
          )}
          {templateId && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm font-medium text-slate-900 mb-1">{subject}</p>
              <div className="text-xs text-slate-600 max-h-40 overflow-y-auto" dangerouslySetInnerHTML={{ __html: body }} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={sending || (!templateId && !subject)}>{sending ? 'Sending…' : 'Send'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}