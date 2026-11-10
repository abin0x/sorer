import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function StepIdentity({ club, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: club.name || "",
    app_name: club.app_name || "",
    logo_url: club.logo_url || "",
    primary_color: club.primary_color || "#399F7D",
    secondary_color: club.secondary_color || "#F59E0B",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      set({ logo_url: file_url });
    } catch (err) {
      toast({ title: "Upload failed", description: err?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("update-club-setup", { clubId: club.id, step: "identity", data: form });
      onSaved();
    } catch (err) {
      toast({ title: "Save failed", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Step 1 of 4 — Club Identity</h2>
        <p className="text-sm text-slate-500">Verify your club name, logo, and colors.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Club Name</Label>
          <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Short Name / Abbreviation</Label>
          <Input value={form.app_name} onChange={(e) => set({ app_name: e.target.value })} placeholder="e.g. RRC" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Club Logo</Label>
        <div className="flex items-center gap-3">
          {form.logo_url && <img src={form.logo_url} alt="logo" className="w-12 h-12 rounded-lg object-contain border border-slate-200" />}
          <Input type="file" accept="image/*" onChange={uploadLogo} disabled={uploading} className="max-w-xs" />
          {uploading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        </div>
        <p className="text-xs text-slate-400">Recommended: 500×500px, PNG or SVG. Stored publicly so it can be shown in the app header, emails, and Beacon.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Primary Color</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.primary_color} onChange={(e) => set({ primary_color: e.target.value })} className="w-9 h-9 rounded border" />
            <Input value={form.primary_color} onChange={(e) => set({ primary_color: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Secondary Color</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.secondary_color} onChange={(e) => set({ secondary_color: e.target.value })} className="w-9 h-9 rounded border" />
            <Input value={form.secondary_color} onChange={(e) => set({ secondary_color: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-3" style={{ background: `${form.primary_color}0d` }}>
        {form.logo_url ? <img src={form.logo_url} className="w-8 h-8 rounded object-contain" /> : <div className="w-8 h-8 rounded" style={{ background: form.primary_color }} />}
        <span className="font-bold" style={{ color: form.primary_color }}>{form.name || "Your Club"}</span>
        <Button size="sm" style={{ background: form.primary_color }} className="ml-auto text-white hover:opacity-90">Preview Button</Button>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving || !form.name.trim()} className="gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save & Continue
        </Button>
      </div>
    </div>
  );
}