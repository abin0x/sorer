import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { addAdminNote } from "@/lib/tryoutDashboard";

/** Staff notes about a player — kept on the registration, oldest first. */
export default function NoteDialog({ reg, onClose, onDone }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const notes = reg.admin_notes || [];

  const save = async () => {
    if (!text.trim()) { toast.error("Write the note first."); return; }
    setBusy(true);
    try {
      await addAdminNote(reg.id, text.trim());
      toast.success("Note added");
      onDone();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Notes — {reg.player_name}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          {notes.length > 0 && (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {notes.map((n, i) => (
                <div key={i} className="text-xs border border-border rounded-lg p-2.5">
                  <p className="text-muted-foreground">{String(n.at || "").slice(0, 16).replace("T", " ")} · {n.by || "staff"}</p>
                  <p className="text-sm whitespace-pre-wrap">{n.text}</p>
                </div>
              ))}
            </div>
          )}
          {notes.length === 0 && <p className="text-xs text-muted-foreground">No notes on this player yet.</p>}
          <div>
            <Label>New note</Label>
            <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Anything the team should know about this player" autoFocus />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button disabled={busy} onClick={save}>{busy ? "Saving…" : "Add note"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}