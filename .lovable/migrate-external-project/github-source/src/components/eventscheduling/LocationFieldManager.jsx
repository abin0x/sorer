import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import ResponsiveSelect from "@/components/shared/ResponsiveSelect";
import { Plus, Trash2, MapPin, Loader2 } from "lucide-react";

export default function LocationFieldManager({ clubId, locations, setLocations, fields, setFields }) {
  const { toast } = useToast();
  const [newLoc, setNewLoc] = useState("");
  const [newField, setNewField] = useState("");
  const [fieldLoc, setFieldLoc] = useState("");
  const [saving, setSaving] = useState(false);

  const addLocation = async () => {
    if (!newLoc.trim()) return;
    setSaving(true);
    try {
      const created = await base44.entities.EventLocation.create({ club_id: clubId, name: newLoc.trim(), timezone: "America/New_York" });
      setLocations((p) => [...p, created]);
      setNewLoc("");
      toast({ title: "Location added" });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const addField = async () => {
    if (!newField.trim() || !fieldLoc) return;
    setSaving(true);
    try {
      const created = await base44.entities.EventField.create({ club_id: clubId, location_id: fieldLoc, name: newField.trim(), capacity: 0, status: "available" });
      setFields((p) => [...p, created]);
      setNewField("");
      toast({ title: "Field added" });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const deleteLocation = async (id) => {
    try { await base44.entities.EventLocation.delete(id); setLocations((p) => p.filter((l) => l.id !== id)); setFields((p) => p.filter((f) => f.location_id !== id)); }
    catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const deleteField = async (id) => {
    try { await base44.entities.EventField.delete(id); setFields((p) => p.filter((f) => f.id !== id)); }
    catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">Locations</Label>
        <div className="flex gap-2 mb-2">
          <Input value={newLoc} onChange={(e) => setNewLoc(e.target.value)} placeholder="Location name (e.g. Main Complex)" onKeyDown={(e) => e.key === "Enter" && addLocation()} />
          <Button onClick={addLocation} disabled={saving || !newLoc.trim()}><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="space-y-1.5">
          {locations.map((l) => (
            <div key={l.id} className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/30">
              <span className="text-sm flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {l.name}</span>
              <Button size="icon" variant="ghost" onClick={() => deleteLocation(l.id)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
            </div>
          ))}
          {locations.length === 0 && <p className="text-xs text-muted-foreground">No locations yet.</p>}
        </div>
      </div>
      <div className="border-t pt-4">
        <Label className="mb-2 block">Fields</Label>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mb-2">
          <Input value={newField} onChange={(e) => setNewField(e.target.value)} placeholder="Field name" />
          <ResponsiveSelect
            className="h-9"
            value={fieldLoc}
            onChange={setFieldLoc}
            placeholder="Select location…"
            label="Location"
            options={locations.map((l) => ({ value: l.id, label: l.name }))}
          />
          <Button onClick={addField} disabled={saving || !newField.trim() || !fieldLoc}><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="space-y-1.5">
          {fields.map((f) => {
            const loc = locations.find((l) => l.id === f.location_id);
            return (
              <div key={f.id} className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/30">
                <span className="text-sm">{f.name} <span className="text-xs text-muted-foreground">— {loc?.name || "Unknown"}</span></span>
                <Button size="icon" variant="ghost" onClick={() => deleteField(f.id)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
              </div>
            );
          })}
          {fields.length === 0 && <p className="text-xs text-muted-foreground">No fields yet.</p>}
        </div>
      </div>
    </div>
  );
}