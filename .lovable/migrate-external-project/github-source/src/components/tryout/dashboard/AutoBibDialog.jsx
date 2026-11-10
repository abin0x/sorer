import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { assignBibs } from "@/lib/tryoutDashboard";

/** Bib numbers in name order, so a printed roster reads sensibly. */
export default function AutoBibDialog({ target, scopeLabel, onClose, onDone }) {
  const [start, setStart] = useState("");
  const [renumber, setRenumber] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const res = await assignBibs({ ...target, start: start ? Number(start) : undefined, renumber });
      toast.success(res.assigned
        ? `${res.assigned} bib number${res.assigned === 1 ? "" : "s"} assigned`
        : "Everyone in this selection already has a bib number");
      onDone();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Auto-assign bib numbers</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">Applies to {scopeLabel}. Players are numbered in name order.</p>
          <div>
            <Label>Start at (optional)</Label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Continue after the last number used"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <Checkbox checked={renumber} onCheckedChange={(v) => setRenumber(!!v)} className="mt-0.5" />
            <span>Renumber everyone, replacing bibs already handed out</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={run}>{busy ? "Assigning…" : "Assign bibs"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}