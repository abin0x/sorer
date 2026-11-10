import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";

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

export default function ProvisionClubPanel({ request, onProvisioned }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    club_name: request?.club_name || "",
    slug: (request?.club_name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    plan_tier: "standard",
    max_branches: request?.branch_count === "10+" ? 12 : request?.branch_count === "4-9" ? 6 : request?.branch_count === "2-3" ? 3 : 1,
    specialist_name: "",
    source_system: "",
    admin_name: request?.contact_name || "",
    admin_email: request?.contact_email || "",
  });
  const [modules, setModules] = useState(DEFAULT_MODULES);
  const [saving, setSaving] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleModule = (key) => setModules((m) => ({ ...m, [key]: !m[key] }));

  const submit = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke("provision-club-and-invite", {
        signupRequestId: request?.id,
        ...form,
        enabled_modules: modules,
      });
      toast({ title: "Invite sent", description: `${form.club_name} → ${form.admin_email} (status: Invited)` });
      onProvisioned();
    } catch (e) {
      toast({ title: "Provisioning failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const canSave = form.club_name.trim() && form.slug.trim() && form.admin_email.trim() && form.admin_name.trim();

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Invite club</h3>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Club Name</Label>
          <Input value={form.club_name} onChange={(e) => set({ club_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Tenant Slug</Label>
          <Input value={form.slug} onChange={(e) => set({ slug: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Plan</Label>
          <Select value={form.plan_tier} onValueChange={(v) => set({ plan_tier: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Branches</Label>
          <Input type="number" min={1} value={form.max_branches} onChange={(e) => set({ max_branches: Number(e.target.value) })} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-slate-500">Modules</Label>
        <div className="grid sm:grid-cols-2 gap-2">
          {Object.entries(MODULE_LABELS).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!modules[key]} onCheckedChange={() => toggleModule(key)} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Migration specialist (optional)</Label>
          <Input value={form.specialist_name} onChange={(e) => set({ specialist_name: e.target.value })} placeholder="e.g. Sarah M." />
        </div>
        <div className="space-y-1.5">
          <Label>Source system (optional)</Label>
          <Input value={form.source_system} onChange={(e) => set({ source_system: e.target.value })} placeholder="e.g. TeamSnap" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
        <div className="space-y-1.5">
          <Label>Admin name</Label>
          <Input value={form.admin_name} onChange={(e) => set({ admin_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Admin email</Label>
          <Input type="email" value={form.admin_email} onChange={(e) => set({ admin_email: e.target.value })} />
        </div>
      </div>

      <Button disabled={!canSave || saving} onClick={submit} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Send invite
      </Button>
    </div>
  );
}