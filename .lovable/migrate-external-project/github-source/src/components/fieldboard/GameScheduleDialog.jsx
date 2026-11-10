import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Circle, UserPlus, Send } from "lucide-react";

export default function GameScheduleDialog({ open, onClose, booking, onUpdated }) {
  const [referees, setReferees] = useState([]);
  const [form, setForm] = useState({ referee: "", trainer: "", volunteer: "", video: "" });
  const [volunteers, setVolunteers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open || !booking) return;
    setForm({
      referee: booking.referee_name || "",
      trainer: booking.trainer_name || "",
      volunteer: "",
      video: booking.video_setup || "",
    });
    setVolunteers(booking.volunteer_names || []);
    base44.entities.Referee.filter({ club_id: booking.club_id, is_active: true }, { limit: 100 })
      .then((r) => setReferees(r.items || []))
      .catch(() => {});
  }, [open, booking]);

  if (!booking) return null;
  const isGame = booking.type === "game" || booking.event_type === "match";
  if (!isGame) return null;

  const items = [
    { key: "referee", label: "Referee", done: !!form.referee },
    { key: "trainer", label: "Trainer", done: !!form.trainer },
    { key: "volunteers", label: "Field Volunteers", done: volunteers.length > 0 },
    { key: "video", label: "Video Setup", done: !!form.video },
  ];
  const allDone = items.every((i) => i.done);
  const isConfirmed = booking.status === "confirmed";

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.Booking.update(booking.id, {
        referee_name: form.referee,
        trainer_name: form.trainer,
        volunteer_names: volunteers,
        video_setup: form.video,
      });
      onUpdated?.();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const confirmGame = async () => {
    setConfirming(true);
    try {
      await base44.functions.invoke("confirm-game-booking", { booking_id: booking.id });
      onUpdated?.();
      onClose?.();
    } catch (e) { console.error(e); }
    setConfirming(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Game Schedule
            {isConfirmed ? <Badge className="bg-green-100 text-green-700">Confirmed</Badge> : <Badge variant="outline">Pending</Badge>}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">{booking.team_name} vs {booking.away_team_name || "TBD"}</p>
          <p>{booking.date} · {booking.start_time} - {booking.end_time} · {booking.field_name}</p>
        </div>
        <div className="space-y-3">
          {/* Scheduling checklist */}
          <div className="grid grid-cols-2 gap-2">
            {items.map((item) => (
              <div key={item.key} className="flex items-center gap-1.5 text-sm">
                {item.done ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
              </div>
            ))}
          </div>
          <div>
            <Label className="text-xs">Referee</Label>
            <Input value={form.referee} onChange={(e) => setForm({ ...form, referee: e.target.value })} placeholder="Assign referee" list="referee-list" />
            <datalist id="referee-list">
              {referees.map((r) => <option key={r.id} value={`${r.first_name} ${r.last_name}`} />)}
            </datalist>
          </div>
          <div>
            <Label className="text-xs">Athletic Trainer</Label>
            <Input value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} placeholder="Assign trainer" />
          </div>
          <div>
            <Label className="text-xs">Field Volunteers</Label>
            <div className="flex gap-2">
              <Input value={form.volunteer} onChange={(e) => setForm({ ...form, volunteer: e.target.value })} placeholder="Add volunteer name" />
              <Button type="button" size="sm" variant="outline" onClick={() => { if (form.volunteer.trim()) { setVolunteers([...volunteers, form.volunteer.trim()]); setForm({ ...form, volunteer: "" }); } }}>
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
            {volunteers.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {volunteers.map((v, i) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                    {v}
                    <button onClick={() => setVolunteers(volunteers.filter((_, j) => j !== i))} className="text-primary/60 hover:text-primary">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs">Video Setup</Label>
            <Input value={form.video} onChange={(e) => setForm({ ...form, video: e.target.value })} placeholder="Person name or status" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          {!isConfirmed && (
            <Button onClick={confirmGame} disabled={confirming || !allDone}>
              <Send className="mr-1.5 h-4 w-4" />{confirming ? "Confirming..." : "Confirm & Notify Teams"}
            </Button>
          )}
        </DialogFooter>
        {!allDone && !isConfirmed && (
          <p className="text-xs text-amber-600">Complete all scheduling items before confirming the game.</p>
        )}
        {isConfirmed && booking.notified && (
          <p className="text-xs text-green-600">Teams have been notified.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}