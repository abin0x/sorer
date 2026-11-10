import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertCircle, Plus, Trash2, ShieldCheck } from "lucide-react";

export default function OutreachSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [domainResult, setDomainResult] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [newSuppression, setNewSuppression] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [settingsRes, auditRes] = await Promise.all([
        base44.functions.invoke('outreach-settings', { action: 'get' }),
        base44.functions.invoke('outreach-settings', { action: 'audit_log', limit: 50 }),
      ]);
      setSettings(settingsRes.data.settings);
      setAuditLog(auditRes.data.items || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('outreach-settings', { action: 'update', ...settings });
      setSettings(res.data.settings);
      alert('Settings saved.');
    } catch (e) { alert(e.response?.data?.error || e.message); } finally { setSaving(false); }
  };

  const testConnection = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await base44.functions.invoke('outreach-settings', { action: 'test_connection' });
      setTestResult(res.data);
    } catch (e) { setTestResult({ success: false, message: e.message }); } finally { setTesting(false); }
  };

  const verifyDomain = async () => {
    setVerifying(true); setDomainResult(null);
    try {
      const res = await base44.functions.invoke('outreach-settings', { action: 'verify_domain' });
      setDomainResult(res.data);
      load();
    } catch (e) { setDomainResult({ error: e.message }); } finally { setVerifying(false); }
  };

  const addSuppression = async () => {
    if (!newSuppression) return;
    await base44.functions.invoke('outreach-settings', { action: 'add_suppression', email: newSuppression, reason: 'manual' });
    setNewSuppression('');
    load();
  };

  const removeSuppression = async (email) => {
    await base44.functions.invoke('outreach-settings', { action: 'remove_suppression', email });
    load();
  };

  if (loading || !settings) return <div className="p-8 text-center text-slate-400">Loading settings…</div>;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="sending">Sending</TabsTrigger>
          <TabsTrigger value="suppression">Suppression</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Resend Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Resend API Key</Label>
                <Input type="password" value={settings.resend_api_key || ''} onChange={e => setSettings({ ...settings, resend_api_key: e.target.value })} placeholder="re_..." />
                <p className="text-xs text-slate-400 mt-1">Stored encrypted. Enter a new key to replace; leave as-is to keep current.</p>
              </div>
              <Button onClick={testConnection} disabled={testing} variant="outline" className="gap-1">
                <ShieldCheck className="w-4 h-4" /> {testing ? 'Testing…' : 'Test Connection'}
              </Button>
              {testResult && (
                <div className={`p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {testResult.success ? <CheckCircle className="w-4 h-4 inline mr-1" /> : <AlertCircle className="w-4 h-4 inline mr-1" />}
                  {testResult.message}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Sender Identity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>From Name</Label><Input value={settings.from_name || ''} onChange={e => setSettings({ ...settings, from_name: e.target.value })} /></div>
              <div><Label>From Address</Label><Input type="email" value={settings.from_address || ''} onChange={e => setSettings({ ...settings, from_address: e.target.value })} /></div>
              <div><Label>Reply-To Address</Label><Input type="email" value={settings.reply_to_address || ''} onChange={e => setSettings({ ...settings, reply_to_address: e.target.value })} /></div>
              <div><Label>Physical Address (CAN-SPAM)</Label><Input value={settings.physical_address || ''} onChange={e => setSettings({ ...settings, physical_address: e.target.value })} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sending" className="space-y-4 mt-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Domain & Tracking</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Tracking Subdomain</Label>
                <Input value={settings.tracking_subdomain || ''} onChange={e => setSettings({ ...settings, tracking_subdomain: e.target.value })} placeholder="links.mail.clubrudder.com" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Domain Verified</Label>
                <Badge className={settings.domain_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{settings.domain_verified ? 'Verified' : 'Not verified'}</Badge>
              </div>
              <Button onClick={verifyDomain} disabled={verifying} variant="outline">{verifying ? 'Verifying…' : 'Verify Domain'}</Button>
              {domainResult && (
                <div className={`p-3 rounded-lg text-sm ${domainResult.verified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                  {domainResult.verified ? 'Domain verified successfully!' : 'Domain not yet verified. Check DNS records in Resend.'}
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <Label>Open Tracking</Label>
                <Switch checked={settings.open_tracking_enabled} onCheckedChange={v => setSettings({ ...settings, open_tracking_enabled: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Click Tracking</Label>
                <Switch checked={settings.click_tracking_enabled} onCheckedChange={v => setSettings({ ...settings, click_tracking_enabled: v })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Send Limits & Warmup</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Daily Send Limit</Label>
                <Input type="number" value={settings.daily_send_limit || 100} onChange={e => setSettings({ ...settings, daily_send_limit: Number(e.target.value) })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Warmup Mode</Label>
                  <p className="text-xs text-slate-400">Throttles sends to ramp up a new domain (20 → 40 → 60 → limit).</p>
                </div>
                <Switch checked={settings.warmup_mode} onCheckedChange={v => setSettings({ ...settings, warmup_mode: v })} />
              </div>
              {settings.warmup_started_at && <p className="text-xs text-slate-400">Warmup started: {new Date(settings.warmup_started_at).toLocaleString()}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Reply Notifications</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Notify on Reply</Label>
                <Switch checked={settings.notify_on_reply} onCheckedChange={v => setSettings({ ...settings, notify_on_reply: v })} />
              </div>
              <div><Label>Notification Email</Label><Input type="email" value={settings.notification_email || ''} onChange={e => setSettings({ ...settings, notification_email: e.target.value })} /></div>
            </CardContent>
          </Card>

          <Button onClick={save} disabled={saving} className="w-full">{saving ? 'Saving…' : 'Save All Settings'}</Button>
        </TabsContent>

        <TabsContent value="suppression" className="space-y-3 mt-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Global Suppression List</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-500">No sequence or one-off send can bypass these addresses.</p>
              <div className="flex gap-2">
                <Input type="email" value={newSuppression} onChange={e => setNewSuppression(e.target.value)} placeholder="email@example.com" />
                <Button onClick={addSuppression} className="gap-1"><Plus className="w-4 h-4" /> Add</Button>
              </div>
              <div className="space-y-1">
                {(settings.suppression_list || []).map(email => (
                  <div key={email} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                    <span className="text-sm text-slate-700">{email}</span>
                    <Button size="icon" variant="ghost" onClick={() => removeSuppression(email)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                ))}
                {(!settings.suppression_list || settings.suppression_list.length === 0) && <p className="text-sm text-slate-400">No suppressed addresses.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Audit Trail</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {auditLog.map((log, i) => (
                  <div key={i} className="px-4 py-2 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">{log.action}</span>
                      <span className="text-xs text-slate-400">{new Date(log.created_date).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-500">{log.actor_email} · {log.entity_type} {log.entity_id?.slice(0, 8)}</p>
                  </div>
                ))}
                {auditLog.length === 0 && <p className="p-8 text-center text-slate-400">No actions logged yet.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}