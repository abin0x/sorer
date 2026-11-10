import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { movePlayers, sessionOptionLabel } from "@/lib/tryoutDashboard";

/** Bulk session assignment for however many players are ticked. */
export default function MovePlayersDialog({ ids, sessions, onClose, onDone }) {
  const [eventId, setEventId] = useState("");
  const [busy, setBusy] = useState(false);

  const move = async () => {
    if (!eventId) { toast.error("Pick the session to move them to."); return; }
    setBusy(true);
    try {
      const res = await movePlayers(ids, eventId);
      const parts = [`${res.moved} moved`];
      if (res.waitlisted) parts.push(`${res.waitlisted} on the waitlist (session full)`);
      if (res.skipped?.length) parts.push(`${res.skipped.length} left unchanged`);
      toast.success(parts.join(" · "));
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
        <DialogHeader>
          <DialogTitle>Move {ids.length} player{ids.length === 1 ? "" : "s"} to a session</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Session</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger><SelectValue placeholder="Pick the session" /></SelectTrigger>
              <SelectContent>
                {sessions.map((e) => <SelectItem key={e.id} value={e.id}>{sessionOptionLabel(e)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            A full session puts the player on the waitlist, and a spot freed up is offered to the family waiting longest.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy || !eventId} onClick={move}>{busy ? "Moving…" : "Move players"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}