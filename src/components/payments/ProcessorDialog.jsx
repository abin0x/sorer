import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const PROCESSOR_TYPES = [
  { value: "stripe", label: "Stripe" },
  { value: "square", label: "Square" },
  { value: "payment_depot", label: "Payment Depot" },
  { value: "stax", label: "Stax" },
  { value: "manual", label: "Manual / Other" },
];

// Credential field config per processor type
const CREDENTIAL_FIELDS = {
  stripe: [
    { key: "secret_key", label: "Secret Key", placeholder: "sk_test_... or sk_live_...", required: true, hint: "Found in Stripe Dashboard → Developers → API keys" },
    { key: "publishable_key", label: "Publishable Key", placeholder: "pk_test_... or pk_live_...", required: false, hint: "Used by the frontend to tokenize cards" },
    { key: "webhook_secret", label: "Webhook Signing Secret", placeholder: "whsec_...", required: false, hint: "Used to verify incoming Stripe webhooks" },
  ],
  square: [
    { key: "secret_key", label: "Access Token", placeholder: "EAAAse... (sandbox) or EAAAl... (production)", required: true, hint: "Found in Square Developer Dashboard → Credentials" },
    { key: "publishable_key", label: "Application ID", placeholder: "sandbox-sq0idb-... or sq0idp-...", required: true, hint: "Square application ID" },
    { key: "location_id", label: "Location ID", placeholder: "L... (e.g. LM2CD...", required: true, hint: "Required to charge cards. Found in Square Dashboard → Locations" },
  ],
  payment_depot: [
    { key: "secret_key", label: "API Key", placeholder: "Your Payment Depot API key", required: true, hint: "Found in Payment Depot Dashboard → Settings → API" },
    { key: "location_id", label: "Gateway ID (optional)", placeholder: "Gateway / merchant ID", required: false, hint: "Only if your account uses multiple gateways" },
  ],
  stax: [
    { key: "secret_key", label: "API Key", placeholder: "Your Stax API key", required: true, hint: "Found in Stax Dashboard → Settings → API" },
  ],
  manual: [],
};

export default function ProcessorDialog({ open, onOpenChange, processor, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [form, setForm] = useState({});
  const [showSecrets, setShowSecrets] = useState({});

  useEffect(() => {
    if (open) {
      setTestResult(null);
      setForm(processor || {
        display_name: "", processor_type: "stripe", environment: "sandbox",
        is_active: true, is_default: false, account_label: "",
        secret_key: "", publishable_key: "", webhook_secret: "", location_id: "",
        notes: "",
      });
    }
  }, [open, processor]);

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const toggleSecret = (key) => setShowSecrets((s) => ({ ...s, [key]: !s[key] }));

  const credFields = CREDENTIAL_FIELDS[form.processor_type] || [];

  const handleTest = async () => {
    const requiredMissing = credFields.filter((f) => f.required && !form[f.key]);
    if (requiredMissing.length > 0) {
      toast.error(`Required: ${requiredMissing.map((f) => f.label).join(", ")}`);
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await base44.functions.invoke("testProcessorConnection", {
        credentials: {
          secret_key: form.secret_key,
          publishable_key: form.publishable_key,
          webhook_secret: form.webhook_secret,
          location_id: form.location_id,
        },
        processor_type: form.processor_type,
        environment: form.environment,
      });
      const result = res.data;
      setTestResult(result);
      if (result.success) {
        toast.success(result.message || "Connection successful");
      } else {
        toast.error(result.error || "Connection failed");
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      setTestResult({ success: false, error: msg });
      toast.error("Test failed: " + msg);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!form.display_name || !form.processor_type) {
      toast.error("Name and processor type are required.");
      return;
    }
    const requiredMissing = credFields.filter((f) => f.required && !form[f.key]);
    if (requiredMissing.length > 0) {
      toast.error(`Required credentials missing: ${requiredMissing.map((f) => f.label).join(", ")}`);
      return;
    }
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const payload = {
        display_name: form.display_name,
        processor_type: form.processor_type,
        environment: form.environment,
        is_active: form.is_active,
        is_default: form.is_default,
        account_label: form.account_label,
        secret_key: form.secret_key,
        publishable_key: form.publishable_key,
        webhook_secret: form.webhook_secret,
        location_id: form.location_id,
        connection_status: testResult?.success ? "connected" : (processor?.connection_status || "untested"),
        last_tested_date: testResult ? new Date().toISOString() : processor?.last_tested_date,
        notes: form.notes,
        connected_by: user?.email,
        connected_date: processor?.id ? processor.connected_date : new Date().toISOString(),
      };
      if (processor?.id) {
        await base44.entities.PaymentProcessor.update(processor.id, payload);
      } else {
        await base44.entities.PaymentProcessor.create(payload);
      }
      toast.success("Processor saved");
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (e) {
      toast.error("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{processor?.id ? "Edit Processor" : "Add Payment Processor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Basic info */}
          <div>
            <Label className="text-xs">Connection Name</Label>
            <Input value={form.display_name || ""} onChange={(e) => handleChange("display_name", e.target.value)} className="rounded-xl" placeholder="Stripe - Main Club" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Processor</Label>
              <Select value={form.processor_type} onValueChange={(v) => { handleChange("processor_type", v); setTestResult(null); }}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROCESSOR_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Environment</Label>
              <Select value={form.environment} onValueChange={(v) => handleChange("environment", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox / Test</SelectItem>
                  <SelectItem value="live">Live / Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Merchant Account Label</Label>
            <Input value={form.account_label || ""} onChange={(e) => handleChange("account_label", e.target.value)} className="rounded-xl" placeholder="Optional nickname / account ID" />
          </div>

          {/* API Credentials */}
          {credFields.length > 0 && (
            <div className="space-y-3 p-3 surface-tile rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold">API Credentials</p>
                <Badge variant="outline" className="text-[10px] ml-auto">{form.environment}</Badge>
              </div>
              {credFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">
                      {field.label}
                      {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                    </Label>
                    {field.key === "secret_key" || field.key === "webhook_secret" ? (
                      <button type="button" onClick={() => toggleSecret(field.key)} className="text-xs text-muted-foreground hover:text-foreground">
                        {showSecrets[field.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    ) : null}
                  </div>
                  <Input
                    type={showSecrets[field.key] ? "text" : "password"}
                    value={form[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="rounded-xl font-mono text-xs"
                    placeholder={field.placeholder}
                  />
                  {field.hint && <p className="text-[11px] text-muted-foreground">{field.hint}</p>}
                </div>
              ))}

              {/* Test Connection button */}
              <div className="flex items-center gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={testing} className="rounded-xl">
                  {testing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                  Test Connection
                </Button>
                {testResult?.success && (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-medium">{testResult.message}</span>
                  </div>
                )}
                {testResult && !testResult.success && (
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-medium truncate">{testResult.error}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Toggles */}
          <div className="flex items-center justify-between p-3 surface-tile rounded-xl">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Available when recording payments</p>
            </div>
            <Switch checked={!!form.is_active} onCheckedChange={(v) => handleChange("is_active", v)} />
          </div>
          <div className="flex items-center justify-between p-3 surface-tile rounded-xl">
            <div>
              <p className="text-sm font-medium">Default Processor</p>
              <p className="text-xs text-muted-foreground">Pre-selected when recording a payment</p>
            </div>
            <Switch checked={!!form.is_default} onCheckedChange={(v) => handleChange("is_default", v)} />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes || ""} onChange={(e) => handleChange("notes", e.target.value)} className="rounded-xl min-h-[60px]" placeholder="e.g. requires live API keys before go-live" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">{saving ? "Saving…" : "Save Processor"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}