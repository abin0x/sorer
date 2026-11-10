import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { POSITION_OPTIONS } from "@/lib/positions";

export default function PlayerEditDialog({ open, onOpenChange, player, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: guardians = [] } = useQuery({
    queryKey: ["all-guardians-for-edit"],
    queryFn: () => base44.entities.Guardian.list("last_name", 500),
    enabled: open,
  });

  useEffect(() => {
    if (player) {
      setForm({
        first_name: player.first_name || "",
        last_name: player.last_name || "",
        date_of_birth: player.date_of_birth || "",
        gender: player.gender || "",
        position: player.position || "",
        jersey_number: player.jersey_number || "",
        status: player.status || "pending",
        medical_notes: player.medical_notes || "",
        notes: player.notes || "",
        photo_url: player.photo_url || "",
        guardian_ids: player.guardian_ids?.length ? player.guardian_ids : (player.guardian_id ? [player.guardian_id] : []),
      });
    }
  }, [player]);

  if (!form) return null;

  const toggleGuardian = (guardianId) => {
    setForm((f) => {
      const has = f.guardian_ids.includes(guardianId);
      return { ...f, guardian_ids: has ? f.guardian_ids.filter((id) => id !== guardianId) : [...f.guardian_ids, guardianId] };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const selectedGuardians = guardians.filter((g) => form.guardian_ids.includes(g.id));
      const primary = selectedGuardians[0];
      const payload = {
        ...form,
        guardian_id: primary?.id || "",
        guardian_name: primary ? `${primary.first_name} ${primary.last_name}` : "",
      };
      await base44.entities.Player.update(player.id, payload);

      // Keep each guardian's player_ids in sync (add/remove this player)
      await Promise.all(guardians.map((g) => {
        const shouldHave = form.guardian_ids.includes(g.id);
        const has = (g.player_ids || []).includes(player.id);
        if (shouldHave && !has) {
          return base44.entities.Guardian.update(g.id, { player_ids: [...(g.player_ids || []), player.id] });
        }
        if (!shouldHave && has) {
          return base44.entities.Guardian.update(g.id, { player_ids: (g.player_ids || []).filter((id) => id !== player.id) });
        }
        return null;
      }));

      toast.success("Player updated");
      onSaved?.(payload);
      onOpenChange(false);
    } catch (e) {
      toast.error("Could not update player");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit Player Info</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First Name</Label>
              <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div>
              <Label>Last Name</Label>
              <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={form.date_of_birth?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Boys">Boys</SelectItem>
                  <SelectItem value="Girls">Girls</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Position</Label>
              <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                <SelectContent>
                  {POSITION_OPTIONS.map((p) => (
                    <SelectItem key={p.key} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Jersey Number</Label>
              <Input value={form.jersey_number} onChange={(e) => setForm({ ...form, jersey_number: e.target.value })} placeholder="e.g. 10" />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="waitlist">Waitlist</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Medical Notes</Label>
            <Textarea value={form.medical_notes} onChange={(e) => setForm({ ...form, medical_notes: e.target.value })} rows={2} placeholder="Allergies, conditions, etc." />
          </div>
          <div>
            <Label>Internal Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Guardians / Parents</Label>
            <p className="text-xs text-muted-foreground mb-1.5">A player can have multiple guardians linked to their record.</p>
            <div className="max-h-40 overflow-y-auto border border-border rounded-md p-2 space-y-1.5">
              {guardians.length === 0 ? (
                <p className="text-xs text-muted-foreground p-1">No guardians found.</p>
              ) : guardians.map((g) => (
                <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={form.guardian_ids.includes(g.id)} onCheckedChange={() => toggleGuardian(g.id)} />
                  <span>{g.first_name} {g.last_name} <span className="text-xs text-muted-foreground">({g.relationship || "guardian"})</span></span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}