import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const SURFACES = ["grass", "turf", "hybrid", "indoor_hard", "futsal"];
const FORMATS = ["11v11", "9v9", "7v7", "4v4"];
const emptyForm = { name: "", facility_id: "", surface: "grass", indoor_outdoor: "outdoor", lighted: false, format_supported: [], max_sections: 8, status: "active", notes: "" };

export default function FieldDialog({ open, onOpenChange, field, facilities, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (field) {
      setForm({
        name: field.name || "", facility_id: field.facility_id || "", surface: field.surface || "grass",
        indoor_outdoor: field.indoor_outdoor || "outdoor", lighted: !!field.lighted,
        format_supported: field.format_supported || [], max_sections: field.max_sections || 8,
        status: field.status || "active", notes: field.notes || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [field, open]);

  const toggleFormat = (fmt) => {
    setForm((f) => ({ ...f, format_supported: f.format_supported.includes(fmt) ? f.format_supported.filter((x) => x !== fmt) : [...f.format_supported, fmt] }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Field name is required."); return; }
    if (!form.facility_id) { toast.error("Please select a facility."); return; }
    setSaving(true);
    try {
      const facility = facilities.find((f) => f.id === form.facility_id);
      const payload = { ...form, facility_name: facility?.name || "" };
      if (field) {
        await base44.entities.Field.update(field.id, payload);
        toast.success("Field updated.");
      } else {
        await base44.entities.Field.create(payload);
        toast.success("Field created.");
      }
      onSaved();
      onOpenChange(false);
    } catch { toast.error("Could not save field."); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{field ? "Edit Field" : "New Field"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Field Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Field 1, North Pitch" /></div>
          <div>
            <Label className="text-xs">Facility *</Label>
            <Select value={form.facility_id} onValueChange={(v) => setForm({ ...form, facility_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger>
              <SelectContent>{facilities.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Surface</Label>
              <Select value={form.surface} onValueChange={(v) => setForm({ ...form, surface: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SURFACES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Indoor/Outdoor</Label>
              <Select value={form.indoor_outdoor} onValueChange={(v) => setForm({ ...form, indoor_outdoor: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="outdoor">Outdoor</SelectItem><SelectItem value="indoor">Indoor</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
            <Label className="text-xs">Lighted for evening use</Label>
            <Switch checked={form.lighted} onCheckedChange={(v) => setForm({ ...form, lighted: v })} />
          </div>
          <div>
            <Label className="text-xs">Formats Supported</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {FORMATS.map((fmt) => (
                <button key={fmt} type="button" onClick={() => toggleFormat(fmt)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${form.format_supported.includes(fmt) ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-muted-foreground border-border hover:bg-muted"}`}>
                  {fmt}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Max Sections</Label><Input type="number" min="1" max="8" value={form.max_sections} onChange={(e) => setForm({ ...form, max_sections: parseInt(e.target.value) || 8 })} /></div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-[50px]" placeholder="e.g. drainage issue on north end" /></div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : field ? "Save Changes" : "Create Field"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}