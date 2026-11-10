import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, FileText, Send, Trash2 } from "lucide-react";

export default function OutreachTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('outreach-templates', { action: 'list' });
      setTemplates(res.data.items || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">{templates.length} templates</p>
        <Button className="gap-1" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Template</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map(t => (
          <Card key={t.id} className="cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => setEditing(t)}>
            <CardContent className="p-4">
              <div className="flex items-start gap-2 mb-2">
                <FileText className="w-4 h-4 text-indigo-500 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{t.name}</p>
                  <p className="text-xs text-slate-500 truncate">{t.subject}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 line-clamp-3">{(t.body_html || '').replace(/<[^>]+>/g, '').slice(0, 200)}</p>
              <div className="flex gap-1 mt-2 flex-wrap">
                {(t.variables || []).map(v => <span key={v} className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{`{{${v}}}`}</span>)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && !loading && <p className="p-8 text-center text-slate-400">No templates. Click "New Template" or they'll auto-seed.</p>}

      {(editing || showCreate) && (
        <TemplateEditor template={editing} onClose={() => { setEditing(null); setShowCreate(false); }} onSaved={() => { setEditing(null); setShowCreate(false); load(); }} />
      )}
    </div>
  );
}

function TemplateEditor({ template, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: template?.name || '',
    subject: template?.subject || '',
    body_html: template?.body_html || '',
    variables: template?.variables || [],
  });
  const [preview, setPreview] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const renderPreview = async () => {
    try {
      const res = await base44.functions.invoke('outreach-templates', {
        action: 'render',
        subject: form.subject,
        body_html: form.body_html,
        variables: form.variables.length ? form.variables : undefined,
      });
      setPreview(res.data.rendered);
    } catch (e) { setPreview({ error: e.response?.data?.error || e.message }); }
  };

  const save = async () => {
    setSaving(true);
    try {
      if (template) {
        await base44.functions.invoke('outreach-templates', { action: 'update', id: template.id, ...form });
      } else {
        await base44.functions.invoke('outreach-templates', { action: 'create', ...form });
      }
      onSaved();
    } catch (e) { alert(e.response?.data?.error || e.message); } finally { setSaving(false); }
  };

  const testSend = async () => {
    setSending(true);
    try {
      const res = await base44.functions.invoke('outreach-templates', {
        action: 'test_send', to: testEmail,
        subject: form.subject, body_html: form.body_html, variables: form.variables,
      });
      alert(res.data.success ? 'Test email sent!' : 'Failed: ' + (res.data.error || ''));
    } catch (e) { alert(e.response?.data?.error || e.message); } finally { setSending(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{template ? 'Edit Template' : 'New Template'}</DialogTitle></DialogHeader>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Left: editor */}
          <div className="space-y-3">
            <div><Label>Template Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Hi {{first_name}}, ..." /></div>
            <div>
              <Label>Body (HTML)</Label>
              <Textarea rows={12} className="font-mono text-xs" value={form.body_html} onChange={e => setForm({ ...form, body_html: e.target.value })} />
            </div>
            <div>
              <Label>Variables (comma-separated)</Label>
              <Input value={form.variables.join(', ')} onChange={e => setForm({ ...form, variables: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })} />
            </div>
            <Button variant="outline" size="sm" onClick={renderPreview}>Render Preview</Button>
          </div>

          {/* Right: preview */}
          <div className="space-y-3">
            <div>
              <Label>Test Send To</Label>
              <div className="flex gap-2">
                <Input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="your@email.com" />
                <Button size="sm" onClick={testSend} disabled={sending || !testEmail} className="gap-1"><Send className="w-3.5 h-3.5" /> Send</Button>
              </div>
            </div>
            {preview?.error ? (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{preview.error}</div>
            ) : preview ? (
              <div className="border border-slate-200 rounded-lg p-3 bg-white max-h-96 overflow-y-auto">
                <p className="text-sm font-bold text-slate-900 mb-2">{preview.subject}</p>
                <div className="text-xs text-slate-600" dangerouslySetInnerHTML={{ __html: preview.html }} />
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 rounded-lg p-8 text-center text-sm text-slate-400">Click "Render Preview" to see the rendered email.</div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.name || !form.subject}>{saving ? 'Saving…' : 'Save Template'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}