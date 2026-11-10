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
import SearchableSelect from "@/components/tryout/SearchableSelect";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { expandOccurrences } from "@/lib/recurrence";
import { buildGameTaskTemplates } from "@/lib/gameTasks";
import { notifyBookingRecipients } from "@/lib/bookingNotifications";

const EVENT_TYPES = [
  { value: "practice", label: "Practice" },
  { value: "game", label: "Game" },
  { value: "tournament", label: "Tournament" },
  { value: "meeting", label: "Meeting" },
  { value: "camp", label: "Camp" },
  { value: "clinic", label: "Clinic" },
  { value: "other", label: "Other" },
];

const STATUSES = ["confirmed", "pending", "cancelled", "postponed"];
const WEEKDAYS = [{ v: 0, l: "S" }, { v: 1, l: "M" }, { v: 2, l: "T" }, { v: 3, l: "W" }, { v: 4, l: "T" }, { v: 5, l: "F" }, { v: 6, l: "S" }];

const DEFAULT_FORM = {
  field_id: "", team_id: "", home_team_id: "", away_team_id: "", is_external_opponent: false, external_opponent_name: "",
  date: new Date().toISOString().split("T")[0], start_time: "17:00", end_time: "18:30",
  event_type: "practice", status: "confirmed", notes: "",
  repeat: "none", weekdays: [], endType: "date", endDate: "", endCount: "8",
  createGameTasks: true,
};

export default function FieldBookingDialog({ open, onOpenChange, booking, onSaved }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const { data: fields = [] } = useQuery({ queryKey: ["fields-manage"], queryFn: () => base44.entities.Field.list("name", 300) });
  const { data: teams = [] } = useQuery({ queryKey: ["teams-for-booking"], queryFn: () => base44.entities.Team.list("name", 300) });
  const { data: players = [] } = useQuery({ queryKey: ["players-for-booking"], queryFn: () => base44.entities.Player.list("last_name", 1000), enabled: open });
  const { data: guardians = [] } = useQuery({ queryKey: ["guardians-for-booking"], queryFn: () => base44.entities.Guardian.list("last_name", 500), enabled: open });
  const { data: coaches = [] } = useQuery({ queryKey: ["coaches-for-booking"], queryFn: () => base44.entities.Coach.list("last_name", 300), enabled: open });

  const isGame = form.event_type === "game";
  const isNew = !booking;

  useEffect(() => {
    if (booking) {
      const start = new Date(booking.start_datetime);
      const end = booking.end_datetime ? new Date(booking.end_datetime) : null;
      setForm({
        ...DEFAULT_FORM,
        field_id: booking.field_id || "",
        team_id: booking.team_ids?.[0] || "",
        home_team_id: booking.home_team_id || booking.team_ids?.[0] || "",
        away_team_id: booking.away_team_id || booking.team_ids?.[1] || "",
        is_external_opponent: !!booking.is_external_opponent,
        external_opponent_name: booking.is_external_opponent ? booking.away_team_name || "" : "",
        date: start.toISOString().split("T")[0],
        start_time: start.toTimeString().slice(0, 5),
        end_time: end ? end.toTimeString().slice(0, 5) : "",
        event_type: booking.event_type || "practice",
        status: booking.status || "confirmed",
        notes: booking.notes || "",
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [booking, open]);

  const toggleWeekday = (v) => setForm((f) => ({ ...f, weekdays: f.weekdays.includes(v) ? f.weekdays.filter((w) => w !== v) : [...f.weekdays, v] }));

  const handleSave = async () => {
    if (!form.field_id) { toast.error("Please select a field."); return; }
    if (!form.date || !form.start_time || !form.end_time) { toast.error("Please set date and times."); return; }

    const field = fields.find((f) => f.id === form.field_id);
    let homeTeam = null, awayTeam = null, teamIds = [], teamNames = [];

    if (isGame) {
      homeTeam = teams.find((t) => t.id === form.home_team_id);
      if (!homeTeam) { toast.error("Home Team is required."); return; }
      if (!form.is_external_opponent) {
        awayTeam = teams.find((t) => t.id === form.away_team_id);
        if (!awayTeam) { toast.error("Away Team is required."); return; }
        if (awayTeam.id === homeTeam.id) { toast.error("Home Team and Away Team must be different."); return; }
      } else if (!form.external_opponent_name.trim()) {
        toast.error("Please enter the external opponent's name.");
        return;
      }
      teamIds = [homeTeam.id, awayTeam?.id].filter(Boolean);
      teamNames = [homeTeam.name, awayTeam?.name || form.external_opponent_name].filter(Boolean);
    } else {
      const team = teams.find((t) => t.id === form.team_id);
      teamIds = team ? [team.id] : [];
      teamNames = team ? [team.name] : [];
    }

    setSaving(true);
    try {
      const buildPayload = (startDt, endDt) => ({
        title: teamNames.length ? `${teamNames.join(" vs ")} ${isGame ? "Game" : "Training"}` : `${field.name} Booking`,
        event_type: form.event_type,
        start_datetime: startDt.toISOString(),
        end_datetime: endDt.toISOString(),
        location_text: field.name,
        facility_id: field.facility_id || "",
        field_id: field.id,
        field_name: field.name,
        team_ids: teamIds,
        team_names: teamNames,
        home_team_id: isGame ? homeTeam.id : "",
        home_team_name: isGame ? homeTeam.name : "",
        away_team_id: isGame && !form.is_external_opponent ? awayTeam.id : "",
        away_team_name: isGame ? (form.is_external_opponent ? form.external_opponent_name : awayTeam.name) : "",
        is_external_opponent: isGame ? form.is_external_opponent : false,
        status: form.status,
        visibility: "team_only",
        notes: form.notes,
      });

      if (booking) {
        const startDt = new Date(`${form.date}T${form.start_time}`);
        const endDt = new Date(`${form.date}T${form.end_time}`);
        await base44.entities.CalendarEvent.update(booking.id, buildPayload(startDt, endDt));
        toast.success("Booking updated.");
      } else {
        const baseStart = new Date(`${form.date}T${form.start_time}`);
        const baseEnd = new Date(`${form.date}T${form.end_time}`);
        const durationMs = baseEnd - baseStart;

        let occurrenceStarts = [baseStart];
        if (form.repeat !== "none") {
          occurrenceStarts = expandOccurrences({
            startDate: baseStart,
            frequency: form.repeat,
            weekdays: form.weekdays,
            endType: form.endType,
            endDate: form.endType === "date" && form.endDate ? new Date(`${form.endDate}T23:59:59`) : null,
            endCount: form.endType === "count" ? parseInt(form.endCount, 10) || 1 : null,
          }).map((d) => new Date(`${d.toISOString().split("T")[0]}T${form.start_time}`));
          if (occurrenceStarts.length === 0) occurrenceStarts = [baseStart];
        }

        const recurrenceGroupId = form.repeat !== "none" ? `rec_${Date.now()}` : "";
        const payloads = occurrenceStarts.map((startDt) => {
          const endDt = new Date(startDt.getTime() + durationMs);
          return {
            ...buildPayload(startDt, endDt),
            is_recurring: form.repeat !== "none",
            recurrence_group_id: recurrenceGroupId,
            calendar_synced: true,
          };
        });

        const created = await base44.entities.CalendarEvent.bulkCreate(payloads);

        if (isGame && form.createGameTasks) {
          const tasks = created.flatMap((ev) =>
            buildGameTaskTemplates({
              eventId: ev.id,
              gameDate: ev.start_datetime,
              homeLabel: homeTeam.name,
              awayLabel: form.is_external_opponent ? form.external_opponent_name : awayTeam.name,
              fieldName: field.name,
            })
          );
          await base44.entities.Task.bulkCreate(tasks);
        }

        const { recipientCount } = await notifyBookingRecipients({ event: created[0], teams, players, guardians, coaches });
        await base44.entities.CalendarEvent.updateMany({ recurrence_group_id: recurrenceGroupId || created[0].id }, { $set: { notified: true, notified_at: new Date().toISOString() } });

        toast.success(
          created.length > 1
            ? `Created ${created.length} bookings and notified ${recipientCount} people.`
            : "Booking created" + (recipientCount ? ` and ${recipientCount} people notified.` : ".")
        );
      }
      onSaved?.();
      onOpenChange(false);
    } catch { toast.error("Could not save booking."); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{booking ? "Edit Field Booking" : "New Field Booking"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Field *</Label>
            <Select value={form.field_id} onValueChange={(v) => setForm({ ...form, field_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>
                {fields.map((f) => <SelectItem key={f.id} value={f.id}>{f.name} {f.facility_name ? `· ${f.facility_name}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Event Type</Label>
            <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {isGame ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Home Team *</Label>
                <SearchableSelect value={form.home_team_id} onChange={(v) => setForm({ ...form, home_team_id: v })} options={teams.map((t) => ({ value: t.id, label: t.name }))} placeholder="Search team..." />
              </div>
              <div>
                <Label className="text-xs">Away Team *</Label>
                {form.is_external_opponent ? (
                  <Input placeholder="Opponent name" value={form.external_opponent_name} onChange={(e) => setForm({ ...form, external_opponent_name: e.target.value })} />
                ) : (
                  <SearchableSelect value={form.away_team_id} onChange={(v) => setForm({ ...form, away_team_id: v })} options={teams.map((t) => ({ value: t.id, label: t.name }))} placeholder="Search team..." />
                )}
                <label className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox checked={form.is_external_opponent} onCheckedChange={(v) => setForm({ ...form, is_external_opponent: !!v, away_team_id: "" })} />
                  External opponent
                </label>
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-xs">Team (optional)</Label>
              <SearchableSelect value={form.team_id} onChange={(v) => setForm({ ...form, team_id: v })} options={teams.map((t) => ({ value: t.id, label: t.name }))} placeholder="No team" />
            </div>
          )}

          <div><Label className="text-xs">Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Start Time *</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><Label className="text-xs">End Time *</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {isNew && (
            <div className="border-t border-border pt-3">
              <Label className="text-xs">Repeat</Label>
              <Select value={form.repeat} onValueChange={(v) => setForm({ ...form, repeat: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>

              {(form.repeat === "weekly" || form.repeat === "biweekly") && (
                <div className="flex gap-1 mt-2">
                  {WEEKDAYS.map((d) => (
                    <button type="button" key={d.v} onClick={() => toggleWeekday(d.v)}
                      className={`text-[10px] w-7 h-7 rounded-full border font-semibold transition-colors ${form.weekdays.includes(d.v) ? "bg-emerald-600 text-white border-emerald-600" : "border-border text-muted-foreground hover:border-emerald-400"}`}>
                      {d.l}
                    </button>
                  ))}
                </div>
              )}

              {form.repeat !== "none" && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label className="text-xs">Ends</Label>
                    <Select value={form.endType} onValueChange={(v) => setForm({ ...form, endType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">On date</SelectItem>
                        <SelectItem value="count">After N occurrences</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.endType === "date" ? (
                    <div><Label className="text-xs">End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
                  ) : (
                    <div><Label className="text-xs">Occurrences</Label><Input type="number" min="1" max="52" value={form.endCount} onChange={(e) => setForm({ ...form, endCount: e.target.value })} /></div>
                  )}
                </div>
              )}
            </div>
          )}

          {isNew && isGame && (
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer border-t border-border pt-3">
              <Checkbox checked={form.createGameTasks} onCheckedChange={(v) => setForm({ ...form, createGameTasks: !!v })} />
              Create standard game tasks (referee, trainer, matchday prep)
            </label>
          )}

          <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-[50px]" /></div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : booking ? "Save Changes" : "Create Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}