import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Users } from "lucide-react";

export default function OutreachSegments() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [members, setMembers] = useState({}); // segmentId -> count

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.entities.ProspectSegment.filter({}, { sort: '-created_date', limit: 200 });
      const items = res.items || res || [];
      setSegments(items);
      // Get member counts
      for (const s of items) {
        const count = await base44.entities.ProspectSegmentMember.count({ segment_id: s.id });
        setMembers(prev => ({ ...prev, [s.id]: count }));
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const deleteSegment = async (id) => {
    if (!confirm('Delete this segment and remove all members?')) return;
    await base44.entities.ProspectSegmentMember.deleteMany({ segment_id: id });
    await base44.entities.ProspectSegment.delete(id);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{segments.length} segments</p>
        <Button className="gap-1" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Segment</Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Name', 'Description', 'Type', 'Members', 'Created', 'Actions'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {segments.map(s => (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{s.name}</td>
                  <td className="px-3 py-2 text-slate-600">{s.description || '—'}</td>
                  <td className="px-3 py-2"><Badge className={s.is_dynamic ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}>{s.is_dynamic ? 'Dynamic' : 'Manual'}</Badge></td>
                  <td className="px-3 py-2 text-slate-600">{members[s.id] || 0}</td>
                  <td className="px-3 py-2 text-slate-500">{new Date(s.created_date).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <Button size="icon" variant="ghost" onClick={() => deleteSegment(s.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {segments.length === 0 && !loading && <p className="p-8 text-center text-slate-400">No segments yet.</p>}
        </CardContent>
      </Card>

      {showCreate && <CreateSegmentDialog onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function CreateSegmentDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', is_dynamic: false });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.ProspectSegment.create({
        name: form.name,
        description: form.description,
        is_dynamic: form.is_dynamic,
        rules: {},
      });
      onCreated();
    } catch (e) { alert(e.response?.data?.error || e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Segment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. directors-multi-branch" /></div>
          <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_dynamic} onChange={e => setForm({ ...form, is_dynamic: e.target.checked })} />
            Dynamic segment (recomputes from rules)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.name}>{saving ? 'Creating…' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}