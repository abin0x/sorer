import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const EVENT_TYPES = ["practice", "game", "tournament", "meeting", "camp", "clinic", "other"];
const STATUSES = ["confirmed", "pending", "cancelled", "postponed"];
const VISIBILITIES = ["club_wide", "team_only", "staff_only"];

const emptyForm = {
  title: "", event_type: "practice", start_datetime: "", end_datetime: "",
  location_text: "", facility_id: "", team_ids: [], status: "confirmed", visibility: "team_only",
  rsvp_required: false, notes: "",
};

export default function TeamEventDialog({ open, onOpenChange, event, manageableTeams = [], defaultTeamId, readOnly = false }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: facilities = [] } = useQuery({
    queryKey: ["facilities-for-event-dialog"],
    queryFn: () => base44.entities.Facility.list("name", 200),
  });

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title || "", event_type: event.event_type || "practice",
        start_datetime: event.start_datetime ? event.start_datetime.slice(0, 16) : "",
        end_datetime: event.end_datetime ? event.end_datetime.slice(0, 16) : "",
        location_text: event.location_text || "", facility_id: event.facility_id || "",
        team_ids: event.team_ids || [],
        status: event.status || "confirmed", visibility: event.visibility || "team_only",
        rsvp_required: !!event.rsvp_required, notes: event.notes || "",
      });
    } else {
      setForm({ ...emptyForm, team_ids: defaultTeamId ? [defaultTeamId] : [] });
    }
  }, [event, defaultTeamId, open]);

  const toggleTeam = (teamId) => {
    setForm((f) => ({
      ...f,
      team_ids: f.team_ids.includes(teamId) ? f.team_ids.filter((id) => id !== teamId) : [...f.team_ids, teamId],
    }));
  };

  const handleSave = async () => {
    if (!form.title || !form.start_datetime) { toast.error("Title and start time are required."); return; }
    if (form.team_ids.length === 0) { toast.error("Select at least one team."); return; }
    setSaving(true);
    try {
      const team_names = manageableTeams.filter((t) => form.team_ids.includes(t.id)).map((t) => t.name);
      const facility = facilities.find((f) => f.id === form.facility_id);
      const payload = {
        title: form.title, event_type: form.event_type,
        start_datetime: new Date(form.start_datetime).toISOString(),
        end_datetime: form.end_datetime ? new Date(form.end_datetime).toISOString() : "",
        location_text: form.location_text, facility_id: form.facility_id || "",
        team_ids: form.team_ids, team_names,
        status: form.status, visibility: form.visibility, rsvp_required: form.rsvp_required, notes: form.notes,
      };
      // Auto-fill location text from the selected facility if empty
      if (facility && !payload.location_text) {
        payload.location_text = facility.address ? `${facility.name} – ${facility.address}` : facility.name;
      }
      if (event) {
        await base44.entities.CalendarEvent.update(event.id, payload);
        toast.success("Event updated.");
      } else {
        await base44.entities.CalendarEvent.create(payload);
        toast.success("Event created.");
      }
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      onOpenChange(false);
    } catch (e) {
      toast.error("Could not save event.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    setSaving(true);
    try {
      await base44.entities.CalendarEvent.delete(event.id);
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Event deleted.");
      onOpenChange(false);
    } catch (e) {
      toast.error("Could not delete event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{readOnly ? "Event Details" : event ? "Edit Event" : "New Team Event"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Title *</Label><Input value={form.title} disabled={readOnly} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Practice — Field 3" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Event Type</Label>
              <Select value={form.event_type} disabled={readOnly} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Status</Label>
              <Select value={form.status} disabled={readOnly} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Start *</Label><Input type="datetime-local" value={form.start_datetime} disabled={readOnly} onChange={(e) => setForm({ ...form, start_datetime: e.target.value })} /></div>
            <div><Label className="text-xs">End</Label><Input type="datetime-local" value={form.end_datetime} disabled={readOnly} onChange={(e) => setForm({ ...form, end_datetime: e.target.value })} /></div>
          </div>
          <div>
            <Label className="text-xs">Facility</Label>
            <Select value={form.facility_id} disabled={readOnly} onValueChange={(v) => setForm({ ...form, facility_id: v })}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>None</SelectItem>
                {facilities.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Location</Label><Input value={form.location_text} disabled={readOnly} onChange={(e) => setForm({ ...form, location_text: e.target.value })} placeholder="Field name or address" /></div>
          <div>
            <Label className="text-xs">Team(s) *</Label>
            <div className="border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1 mt-1">
              {manageableTeams.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No teams available to assign.</p>
              ) : manageableTeams.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={form.team_ids.includes(t.id)} onCheckedChange={() => toggleTeam(t.id)} />
                  {t.name}
                </label>
              ))}
            </div>
          </div>
          <div><Label className="text-xs">Visibility</Label>
            <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{VISIBILITIES.map((v) => <SelectItem key={v} value={v} className="capitalize">{v.replace("_", " ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={form.rsvp_required} onCheckedChange={(v) => setForm({ ...form, rsvp_required: !!v })} />
            RSVP required
          </label>
          <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} disabled={readOnly} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-[60px]" /></div>
        </div>
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          {readOnly ? (
            <Button onClick={() => onOpenChange(false)} className="bg-primary hover:bg-primary/90 ml-auto">
              Close
            </Button>
          ) : (
            <>
              {event ? (
                <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleDelete} disabled={saving}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              ) : <span />}
              <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : event ? "Save Changes" : "Create Event"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}