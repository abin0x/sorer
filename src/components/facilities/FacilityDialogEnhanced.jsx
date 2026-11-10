import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Grid3x3, Clock, Phone } from "lucide-react";
import { toast } from "sonner";

const DAYS = [
  { key: "mon", label: "Mon" }, { key: "tue", label: "Tue" }, { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" }, { key: "fri", label: "Fri" }, { key: "sat", label: "Sat" }, { key: "sun", label: "Sun" },
];

const SURFACES = ["grass", "turf", "hybrid", "indoor_hard", "futsal"];
const FORMATS = ["11v11", "9v9", "7v7", "4v4"];

const defaultDailyHours = () => {
  const h = {};
  for (const d of DAYS) h[d.key] = { available: true, open: "08:00", close: "22:00" };
  return h;
};

const emptyField = () => ({
  name: "", format_supported: ["11v11"], surface: "turf", indoor_outdoor: "outdoor",
  lighted: false, use_custom_hours: false, daily_hours: defaultDailyHours(),
  status: "active", max_sections: 8, notes: "",
});

const emptyForm = {
  name: "", address: "", phone: "", branch_ids: [],
  daily_hours: defaultDailyHours(), notes: "", fields: [emptyField()],
};

function DailyHoursEditor({ hours, onChange }) {
  return (
    <div className="space-y-1.5">
      {DAYS.map((d) => {
        const h = hours[d.key] || { available: true, open: "08:00", close: "22:00" };
        return (
          <div key={d.key} className="flex items-center gap-2">
            <div className="w-10 shrink-0"><span className="text-xs font-medium">{d.label}</span></div>
            <Switch checked={!!h.available} onCheckedChange={(v) => onChange({ ...hours, [d.key]: { ...h, available: v } })} />
            {h.available ? (
              <div className="flex items-center gap-1.5 flex-1">
                <Input type="time" value={h.open || "08:00"} onChange={(e) => onChange({ ...hours, [d.key]: { ...h, open: e.target.value } })} className="h-8 text-xs w-28" />
                <span className="text-xs text-muted-foreground">–</span>
                <Input type="time" value={h.close || "22:00"} onChange={(e) => onChange({ ...hours, [d.key]: { ...h, close: e.target.value } })} className="h-8 text-xs w-28" />
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">Unavailable</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FacilityDialogEnhanced({ open, onOpenChange, facility, locations, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [removedFieldIds, setRemovedFieldIds] = useState([]);

  useEffect(() => {
    (async () => {
      if (facility) {
        let existingFields = [];
        try { existingFields = await base44.entities.Field.filter({ facility_id: facility.id }); } catch {}
        const fieldForms = existingFields.length > 0 ? existingFields.map((fld) => ({
          id: fld.id, name: fld.name || "", surface: fld.surface || "grass",
          indoor_outdoor: fld.indoor_outdoor || "outdoor", lighted: !!fld.lighted,
          format_supported: fld.format_supported || [],
          use_custom_hours: !!(fld.daily_hours && Object.keys(fld.daily_hours).length),
          daily_hours: fld.daily_hours && Object.keys(fld.daily_hours).length ? fld.daily_hours : defaultDailyHours(),
          status: fld.status || "active", max_sections: fld.max_sections || 8, notes: fld.notes || "",
        })) : [emptyField()];
        setForm({
          name: facility.name || "", address: facility.address || "", phone: facility.phone || "",
          branch_ids: facility.branch_ids?.length ? facility.branch_ids : (facility.location_id ? [facility.location_id] : []),
          daily_hours: facility.daily_hours && Object.keys(facility.daily_hours).length ? facility.daily_hours : defaultDailyHours(),
          notes: facility.notes || "", fields: fieldForms,
        });
        setRemovedFieldIds([]);
      } else {
        setForm({ ...emptyForm, fields: [emptyField()] });
        setRemovedFieldIds([]);
      }
    })();
  }, [facility, open]);

  const toggleBranch = (id) => {
    setForm((f) => ({ ...f, branch_ids: f.branch_ids.includes(id) ? f.branch_ids.filter((x) => x !== id) : [...f.branch_ids, id] }));
  };

  const updateField = (idx, patch) => {
    setForm((f) => ({ ...f, fields: f.fields.map((fld, i) => (i === idx ? { ...fld, ...patch } : fld)) }));
  };
  const addField = () => setForm((f) => ({ ...f, fields: [...f.fields, emptyField()] }));
  const removeField = (idx) => {
    const fld = form.fields[idx];
    if (fld?.id) setRemovedFieldIds((prev) => [...prev, fld.id]);
    setForm((f) => ({ ...f, fields: f.fields.filter((_, i) => i !== idx) }));
  };

  const toggleFieldFormat = (idx, fmt) => {
    setForm((f) => ({
      ...f,
      fields: f.fields.map((fld, i) => i === idx ? {
        ...fld,
        format_supported: fld.format_supported.includes(fmt) ? fld.format_supported.filter((x) => x !== fmt) : [...fld.format_supported, fmt]
      } : fld)
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Facility name is required."); return; }
    setSaving(true);
    try {
      const branchNames = form.branch_ids.map((id) => locations.find((l) => l.id === id)?.name).filter(Boolean);
      const availDays = DAYS.filter((d) => form.daily_hours[d.key]?.available).map((d) => d.key);
      const firstAvail = DAYS.find((d) => form.daily_hours[d.key]?.available);
      const opHours = firstAvail ? `${form.daily_hours[firstAvail.key].open} – ${form.daily_hours[firstAvail.key].close}` : "";

      const payload = {
        name: form.name,
        address: form.address,
        phone: form.phone,
        branch_ids: form.branch_ids,
        branch_names: branchNames,
        location_id: form.branch_ids[0] || null,
        location_name: branchNames[0] || "",
        daily_hours: form.daily_hours,
        available_days: availDays,
        operating_hours: opHours,
        field_count: form.fields.filter((f) => f.name.trim()).length || 1,
        capacity: form.fields.filter((f) => f.name.trim()).length || 1,
        surface_type: form.fields.length > 0 ? (form.fields.every((f) => f.surface === "turf") ? "turf" : "mixed") : "grass",
        notes: form.notes,
      };

      let facilityId;
      if (facility) {
        await base44.entities.Facility.update(facility.id, payload);
        facilityId = facility.id;
        toast.success("Facility updated.");
      } else {
        const created = await base44.entities.Facility.create(payload);
        facilityId = created.id;
        toast.success("Facility created.");
      }

      // Sync fields — create new, update existing, delete removed
      let created = 0, updated = 0;
      for (const fld of form.fields) {
        if (!fld.name.trim()) continue;
        const fieldPayload = {
          name: fld.name, facility_id: facilityId, facility_name: form.name,
          surface: fld.surface, indoor_outdoor: fld.indoor_outdoor, lighted: fld.lighted,
          format_supported: fld.format_supported, max_sections: fld.max_sections || 8,
          status: fld.status || "active",
          daily_hours: fld.use_custom_hours ? fld.daily_hours : {},
          available_days: fld.use_custom_hours ? DAYS.filter((d) => fld.daily_hours[d.key]?.available).map((d) => d.key) : [],
          notes: fld.notes || "",
        };
        if (fld.id) { await base44.entities.Field.update(fld.id, fieldPayload); updated++; }
        else { await base44.entities.Field.create(fieldPayload); created++; }
      }
      for (const id of removedFieldIds) { await base44.entities.Field.delete(id).catch(() => {}); }
      if (created > 0 || updated > 0) {
        const parts = [];
        if (created > 0) parts.push(`${created} field${created > 1 ? "s" : ""} created`);
        if (updated > 0) parts.push(`${updated} field${updated > 1 ? "s" : ""} updated`);
        toast.success(parts.join(", ") + ".");
      }

      onSaved();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Could not save facility.");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{facility ? "Edit Facility" : "New Facility"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            <div><Label className="text-xs">Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. UWM Sports Complex" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-xs">Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street address" /></div>
              <div><Label className="text-xs"><Phone className="w-3 h-3 inline mr-1" />Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. +1 248 515 7362" /></div>
            </div>
            <div>
              <Label className="text-xs">Branches — multiple branches can share this facility</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {locations.map((l) => (
                  <button key={l.id} type="button" onClick={() => toggleBranch(l.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${form.branch_ids.includes(l.id) ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:bg-muted"}`}>
                    {l.name}
                  </button>
                ))}
                {locations.length === 0 && <span className="text-xs text-muted-foreground italic">No branches configured</span>}
              </div>
            </div>
          </div>

          <div className="border border-border rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /><Label className="text-sm font-semibold">Global Operating Hours</Label></div>
            <DailyHoursEditor hours={form.daily_hours} onChange={(h) => setForm({ ...form, daily_hours: h })} />
          </div>

          <div className="border border-border rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Grid3x3 className="w-4 h-4 text-primary" /><Label className="text-sm font-semibold">Fields</Label></div>
                <Button size="sm" variant="outline" onClick={addField} className="text-xs h-8"><Plus className="w-3 h-3 mr-1" />Add Field</Button>
              </div>
              {form.fields.map((fld, idx) => (
                <div key={idx} className="border border-border/60 rounded-lg p-3 space-y-2.5 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Field {idx + 1}</span>
                    {form.fields.length > 1 && <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => removeField(idx)}><Trash2 className="w-3 h-3" /></Button>}
                  </div>
                  <div><Label className="text-xs">Field Name</Label><Input value={fld.name} onChange={(e) => updateField(idx, { name: e.target.value })} placeholder="e.g. Outdoor Turf 1" className="h-8" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Surface</Label>
                      <Select value={fld.surface} onValueChange={(v) => updateField(idx, { surface: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>{SURFACES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Indoor/Outdoor</Label>
                      <Select value={fld.indoor_outdoor} onValueChange={(v) => updateField(idx, { indoor_outdoor: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="outdoor">Outdoor</SelectItem><SelectItem value="indoor">Indoor</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border border-border/60 rounded-lg px-2.5 py-1.5">
                    <Label className="text-xs">Lighted</Label>
                    <Switch checked={fld.lighted} onCheckedChange={(v) => updateField(idx, { lighted: v })} />
                  </div>
                  <div>
                    <Label className="text-xs">Size / Format</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {FORMATS.map((fmt) => (
                        <button key={fmt} type="button" onClick={() => toggleFieldFormat(idx, fmt)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${fld.format_supported.includes(fmt) ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:bg-muted"}`}>
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border border-border/60 rounded-lg px-2.5 py-1.5">
                    <Label className="text-xs">Custom hours (override facility defaults)</Label>
                    <Switch checked={fld.use_custom_hours} onCheckedChange={(v) => updateField(idx, { use_custom_hours: v })} />
                  </div>
                  {fld.use_custom_hours && <DailyHoursEditor hours={fld.daily_hours} onChange={(h) => updateField(idx, { daily_hours: h })} />}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={fld.status || "active"} onValueChange={(v) => updateField(idx, { status: v })}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Max Sections</Label><Input type="number" min="1" max="8" value={fld.max_sections || 8} onChange={(e) => updateField(idx, { max_sections: parseInt(e.target.value) || 8 })} className="h-8" /></div>
                  </div>
                  <div><Label className="text-xs">Notes</Label><Input value={fld.notes || ""} onChange={(e) => updateField(idx, { notes: e.target.value })} placeholder="e.g. drainage issue" className="h-8" /></div>
                </div>
              ))}
          </div>

          <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-[50px]" /></div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : facility ? "Save Facility & Fields" : "Create Facility & Fields"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}