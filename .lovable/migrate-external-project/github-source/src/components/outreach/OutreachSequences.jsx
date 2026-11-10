import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Play, Pause, Archive, Copy, Trash2, ChevronRight } from "lucide-react";

export default function OutreachSequences() {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('outreach-sequences', { action: 'list' });
      setSequences(res.data.items || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openSequence = async (id) => {
    const res = await base44.functions.invoke('outreach-sequences', { action: 'get', id });
    setSelected(res.data);
  };

  const updateStatus = async (id, status) => {
    const action = status === 'active' ? 'activate' : status === 'paused' ? 'pause' : 'archive';
    await base44.functions.invoke('outreach-sequences', { action, id });
    load();
  };

  if (selected) return <SequenceBuilder data={selected} onBack={() => { setSelected(null); load(); }} />;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{sequences.length} sequences</p>
        <Button className="gap-1" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Sequence</Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Name', 'Segment', 'Status', 'Enrolled', 'Created', 'Actions'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sequences.map(s => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => openSequence(s.id)}>
                  <td className="px-3 py-2 font-medium text-slate-900">{s.name}</td>
                  <td className="px-3 py-2 text-slate-600">{s.segment_name || '—'}</td>
                  <td className="px-3 py-2"><Badge className={s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}>{s.status}</Badge></td>
                  <td className="px-3 py-2 text-slate-600">{s.enrolled_count || 0}</td>
                  <td className="px-3 py-2 text-slate-500">{new Date(s.created_date).toLocaleDateString()}</td>
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {s.status === 'active' ? (
                        <Button size="icon" variant="ghost" onClick={() => updateStatus(s.id, 'paused')}><Pause className="w-4 h-4" /></Button>
                      ) : s.status === 'paused' ? (
                        <Button size="icon" variant="ghost" onClick={() => updateStatus(s.id, 'active')}><Play className="w-4 h-4" /></Button>
                      ) : null}
                      <Button size="icon" variant="ghost" onClick={() => updateStatus(s.id, 'archived')}><Archive className="w-4 h-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sequences.length === 0 && !loading && <p className="p-8 text-center text-slate-400">No sequences yet. Create one to get started.</p>}
        </CardContent>
      </Card>

      {showCreate && <CreateSequenceDialog onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreateSequenceDialog({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [segments, setSegments] = useState([]);
  const [segmentId, setSegmentId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.ProspectSegment.filter({}, { sort: '-created_date', limit: 100 })
      .then(r => setSegments(r.items || r || []))
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const seg = segments.find(s => s.id === segmentId);
      const res = await base44.functions.invoke('outreach-sequences', {
        action: 'create', name, segment_id: segmentId, segment_name: seg?.name || '',
      });
      onCreated();
    } catch (e) { alert(e.response?.data?.error || e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Sequence</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Sequence Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Directors — Multi-Branch Q4" /></div>
          <div>
            <Label>Target Segment (optional)</Label>
            <Select value={segmentId} onValueChange={setSegmentId}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                {segments.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !name}>{saving ? 'Creating…' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SequenceBuilder({ data, onBack }) {
  const { sequence, steps, active_enrollments } = data;
  const [templates, setTemplates] = useState([]);
  const [editingStep, setEditingStep] = useState(null);
  const [showAddStep, setShowAddStep] = useState(false);

  const loadTemplates = async () => {
    const res = await base44.functions.invoke('outreach-templates', { action: 'list' });
    setTemplates(res.data.items || []);
  };

  useEffect(() => { loadTemplates(); }, []);

  const activate = async () => {
    await base44.functions.invoke('outreach-sequences', { action: 'activate', id: sequence.id });
    onBack();
  };

  const enrollSegment = async () => {
    if (!sequence.segment_id) { alert('No segment assigned to this sequence.'); return; }
    const res = await base44.functions.invoke('outreach-sequences', {
      action: 'enroll', sequence_id: sequence.id, segment_id: sequence.segment_id,
    });
    alert(`Enrolled ${res.data.enrolled} prospects (${res.data.skipped} skipped).`);
    onBack();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
          <h2 className="text-lg font-bold text-slate-900">{sequence.name}</h2>
          <Badge className={sequence.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>{sequence.status}</Badge>
        </div>
        <div className="flex gap-2">
          {sequence.segment_id && (
            <Button variant="outline" size="sm" onClick={enrollSegment}>Enroll Segment</Button>
          )}
          {sequence.status === 'draft' && steps.length > 0 && (
            <Button size="sm" onClick={activate} className="gap-1"><Play className="w-3.5 h-3.5" /> Activate</Button>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-500">{active_enrollments} active enrollments · {steps.length} steps</p>

      {/* Steps timeline */}
      <div className="space-y-3">
        {steps.map((step, i) => (
          <Card key={step.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">{step.step_order}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-900">{step.subject_template || '(no subject)'}</span>
                    {step.condition !== 'always' && <Badge className="bg-purple-100 text-purple-700">{step.condition}</Badge>}
                    {step.ab_variant && <Badge className="bg-blue-100 text-blue-700">Variant {step.ab_variant}</Badge>}
                  </div>
                  <p className="text-xs text-slate-500">Delay: {step.delay_days} day(s) · {step.template_name || 'Inline body'}</p>
                  {step.body_template && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{step.body_template.replace(/<[^>]+>/g, '').slice(0, 150)}</p>}
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditingStep(step)}>Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" className="w-full gap-1" onClick={() => setShowAddStep(true)}><Plus className="w-4 h-4" /> Add Step</Button>

      {(editingStep || showAddStep) && (
        <StepEditorDialog
          step={editingStep}
          sequenceId={sequence.id}
          templates={templates}
          stepOrder={editingStep ? editingStep.step_order : steps.length + 1}
          onClose={() => { setEditingStep(null); setShowAddStep(false); }}
          onSaved={() => { setEditingStep(null); setShowAddStep(false); onBack(); }}
        />
      )}
    </div>
  );
}

function StepEditorDialog({ step, sequenceId, templates, stepOrder, onClose, onSaved }) {
  const [form, setForm] = useState({
    delay_days: step?.delay_days || 0,
    subject_template: step?.subject_template || '',
    body_template: step?.body_template || '',
    template_id: step?.template_id || '',
    condition: step?.condition || 'always',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const tpl = templates.find(t => t.id === form.template_id);
      if (step) {
        await base44.functions.invoke('outreach-sequences', {
          action: 'update_step', step_id: step.id, ...form, template_name: tpl?.name || '',
        });
      } else {
        await base44.functions.invoke('outreach-sequences', {
          action: 'add_step', sequence_id: sequenceId, step_order: stepOrder, ...form, template_name: tpl?.name || '',
        });
      }
      onSaved();
    } catch (e) { alert(e.response?.data?.error || e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{step ? 'Edit Step' : 'Add Step'} {stepOrder}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Delay (days after previous)</Label>
              <Input type="number" value={form.delay_days} onChange={e => setForm({ ...form, delay_days: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={form.condition} onValueChange={v => setForm({ ...form, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Always send</SelectItem>
                  <SelectItem value="if_not_opened">If not opened</SelectItem>
                  <SelectItem value="if_not_clicked">If not clicked</SelectItem>
                  <SelectItem value="if_opened_not_clicked">If opened, not clicked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Template (optional)</Label>
            <Select value={form.template_id} onValueChange={v => setForm({ ...form, template_id: v })}>
              <SelectTrigger><SelectValue placeholder="Inline body" /></SelectTrigger>
              <SelectContent>
                {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Subject (supports {`{{first_name}}`}, {`{{club_name}}`})</Label><Input value={form.subject_template} onChange={e => setForm({ ...form, subject_template: e.target.value })} /></div>
          {!form.template_id && <div><Label>Body (HTML, supports {`{{variables}}`})</Label><Textarea rows={6} value={form.body_template} onChange={e => setForm({ ...form, body_template: e.target.value })} /></div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}