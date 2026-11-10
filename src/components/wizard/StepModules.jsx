import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

const MODULE_LABELS = {
  registration: "Registration & Tryouts",
  payments: "Payments & Billing",
  messaging: "Messaging (Beacon)",
  scheduling: "Scheduling & Events",
  player_dev: "Player Development",
  facilities: "Facilities & Rentals",
  tournaments: "Tournaments",
  merchandise: "Merchandise (add-on)",
};

const DEFAULT_MODULES = {
  registration: true, payments: true, messaging: true, scheduling: true,
  tryouts: true, player_dev: true, facilities: true, tournaments: true, merchandise: false,
};

export default function StepModules({ club, onSaved, onBack }) {
  const { toast } = useToast();
  const [modules, setModules] = useState({ ...DEFAULT_MODULES, ...(club.enabled_modules || {}) });
  const [saving, setSaving] = useState(false);

  const toggle = (key) => setModules((m) => ({ ...m, [key]: !m[key] }));

  const save = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("update-club-setup", { clubId: club.id, step: "modules", data: { enabled_modules: modules } });
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
        <h2 className="text-lg font-bold text-slate-900">Step 3 of 4 — Activate Your Modules</h2>
        <p className="text-sm text-slate-500">Your plan includes all standard modules. You can change these anytime in Settings.</p>
      </div>

      <div className="space-y-2">
        {Object.entries(MODULE_LABELS).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-primary/40 cursor-pointer">
            <Checkbox checked={!!modules[key]} onCheckedChange={() => toggle(key)} />
            <span className="text-sm font-medium text-slate-700">{label}</span>
          </label>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save & Continue
        </Button>
      </div>
    </div>
  );
}