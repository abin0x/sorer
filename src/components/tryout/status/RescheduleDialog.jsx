import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { SESSION_LABEL, rescheduleRegistration } from "@/lib/tryoutRegisterApi";

/** Move a registered player to another session, if the window is still open. */
export default function RescheduleDialog({ registration, email, onClose, onChanged }) {
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const options = registration.alternative_sessions || [];

  const move = async () => {
    if (!selected) { toast.error("Pick a session first."); return; }
    setSaving(true);
    try {
      const res = await rescheduleRegistration({ registration_id: registration.id, event_id: selected, email });
      toast.success(res.waitlisted ? "Moved — that session is full, so you are on its waitlist" : "Session changed");
      onChanged();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Change {registration.player_name}'s session</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
          {options.map((s) => (
            <button
              type="button"
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={`w-full text-left border rounded-xl p-3.5 flex items-center justify-between gap-3 ${selected === s.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <div>
                <p className="text-sm font-medium">{SESSION_LABEL[s.type] || "Session"}</p>
                <p className="text-xs text-muted-foreground flex flex-wrap gap-x-3 mt-0.5">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{s.date}</span>
                  {s.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.start_time}</span>}
                  {s.field_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.field_name}</span>}
                </p>
              </div>
              {s.waitlist
                ? <Badge className="bg-amber-100 text-amber-700 text-[10px] shrink-0">Waitlist</Badge>
                : <Badge variant="outline" className="text-[10px] shrink-0">{s.spots_left === null ? "Open" : `${s.spots_left} left`}</Badge>}
            </button>
          ))}
          {options.length === 0 && <p className="text-sm text-muted-foreground">No other sessions are open for this tryout.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Keep current session</Button>
          <Button onClick={move} disabled={saving || !selected}>{saving ? "Moving…" : "Move session"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}