import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { prepareNextSeason } from "@/lib/seasonRollover";

/** Phase 1: create the next season as Preparing and propose aged-up teams. */
export default function PrepareSeasonDialog({ source, clubId, onClose, onDone }) {
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  if (!source) return null;

  const go = async () => {
    setBusy(true);
    try {
      await prepareNextSeason({ source, name, startDate: start, endDate: end, clubId });
      toast.success(`${name} is being prepared. Review the proposed teams next.`);
      setName("");
      onDone();
    } catch (e) {
      toast.error(e.message || "Could not prepare the season.");
    }
    setBusy(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Prepare next season from "{source.name}"</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <p className="text-muted-foreground">
            Teams age up one group, the oldest group is flagged Retire, coaches are carried as suggestions, and players are not placed on rosters.
            "{source.name}" stays live until you run the Season Switch.
          </p>
          <div className="space-y-1.5"><Label>Season name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2027-2028" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Start</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>End</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={go} disabled={busy || !name}>{busy ? "Preparing…" : "Prepare season"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}