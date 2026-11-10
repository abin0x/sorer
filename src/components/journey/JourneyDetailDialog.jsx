import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { JOURNEY_STAGES } from "@/lib/journeyStages";

export default function JourneyDetailDialog({ record, open, onOpenChange, onSaved }) {
  const [stage, setStage] = useState(record.stage);
  const [notes, setNotes] = useState(record.notes || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.ClientJourney.update(record.id, { stage, notes });
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{record.club_name || record.contact_name || record.contact_email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-500">Contact:</span> {record.contact_name || "—"}</div>
            <div><span className="text-slate-500">Email:</span> {record.contact_email}</div>
            <div><span className="text-slate-500">Branches:</span> {record.branch_count || "—"}</div>
            <div><span className="text-slate-500">Source:</span> <span className="capitalize">{record.source}</span></div>
          </div>
          <div>
            <Label>Stage</Label>
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {JOURNEY_STAGES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}