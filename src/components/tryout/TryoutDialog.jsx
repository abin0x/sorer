import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect from "@/components/tryout/SearchableSelect";
import { toast } from "sonner";

const EMPTY = {
  title: "", location_id: "", team_id: "", age_group: "", gender: "",
  season: "", league: "", team_plans: "", event_date: "", event_time: "",
  field_location: "", capacity: "", status: "scheduled", notes: "",
};

export default function TryoutDialog({ open, onOpenChange, tryout }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const { data: locations = [] } = useQuery({
    queryKey: ["locations-for-tryout"],
    queryFn: () => base44.entities.Location.list("name", 100),
  });
  const { data: teams = [] } = useQuery({
    queryKey: ["teams-for-tryout-dialog"],
    queryFn: () => base44.entities.Team.list("name", 200),
  });

  useEffect(() => {
    setForm(tryout ? { ...EMPTY, ...tryout } : EMPTY);
  }, [tryout, open]);

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleTeamSelect = (id) => {
    const team = teams.find((t) => t.id === id);
    setForm((f) => ({
      ...f, team_id: id, team_name: team?.name || "",
      age_group: team?.age_group || f.age_group,
      gender: team?.gender || f.gender,
      season: team?.season || f.season,
      program_id: team?.program_id || f.program_id,
      program_title: team?.program_title || f.program_title,
      location_id: team?.location_id || f.location_id,
      location_name: team?.location_name || f.location_name,
    }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.location_id || !form.event_date) {
      toast.error("Please fill in title, location, and date.");
      return;
    }
    setSaving(true);
    const location = locations.find((l) => l.id === form.location_id);
    const payload = { ...form, location_name: location?.name || "", capacity: form.capacity ? Number(form.capacity) : undefined };
    try {
      if (tryout?.id) {
        await base44.entities.TryoutEvent.update(tryout.id, payload);
        const changes = {};
        if (form.event_date && form.event_date !== tryout.event_date) changes.date = form.event_date;
        if (form.event_time && form.event_time !== tryout.event_time) changes.time = form.event_time;
        if (form.field_location && form.field_location !== tryout.field_location) changes.location = form.field_location;
        if (Object.keys(changes).length && (tryout.registration_count || 0) > 0) {
          await base44.functions.invoke("tryoutNotify", { event_id: tryout.id, type: "changed", changes }).catch(() => {});
          toast.success("Tryout updated — registered families notified of the change");
        } else {
          toast.success("Tryout updated");
        }
      } else {
        await base44.entities.TryoutEvent.create(payload);
        toast.success("Tryout created");
      }
      queryClient.invalidateQueries({ queryKey: ["tryouts"] });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader><DialogTitle>{tryout ? "Edit Tryout" : "New Tryout Event"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Event Title</Label>
            <Input value={form.title} onChange={(e) => handleChange("title", e.target.value)} className="rounded-xl" placeholder="U14 Boys Fall Tryout" />
          </div>
          <div>
            <Label>Team / Age Group</Label>
            <SearchableSelect
              value={form.team_id}
              onChange={handleTeamSelect}
              options={teams.map((t) => ({ value: t.id, label: `${t.name}${t.age_group ? ` (${t.age_group})` : ""}` }))}
              placeholder="Select team (auto-fills info)"
            />
          </div>
          <div>
            <Label>Location</Label>
            <Select value={form.location_id} onValueChange={(v) => handleChange("location_id", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select location" /></SelectTrigger>
              <SelectContent>
                {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.event_date} onChange={(e) => handleChange("event_date", e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <Label>Time</Label>
              <Input value={form.event_time} onChange={(e) => handleChange("event_time", e.target.value)} className="rounded-xl" placeholder="6:00 PM" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Age Group</Label>
              <Input value={form.age_group} onChange={(e) => handleChange("age_group", e.target.value)} className="rounded-xl" placeholder="U14" />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => handleChange("gender", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Boys">Boys</SelectItem>
                  <SelectItem value="Girls">Girls</SelectItem>
                  <SelectItem value="Boys and Girls">Boys and Girls</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Season</Label>
              <Input value={form.season} onChange={(e) => handleChange("season", e.target.value)} className="rounded-xl" placeholder="2026-2027" />
            </div>
            <div>
              <Label>League</Label>
              <Input value={form.league} onChange={(e) => handleChange("league", e.target.value)} className="rounded-xl" placeholder="MSPRL, NPL, ECNL…" />
            </div>
          </div>
          <div>
            <Label>Field / Venue</Label>
            <Input value={form.field_location} onChange={(e) => handleChange("field_location", e.target.value)} className="rounded-xl" placeholder="Field name and address" />
          </div>
          <div>
            <Label>Capacity</Label>
            <Input type="number" value={form.capacity} onChange={(e) => handleChange("capacity", e.target.value)} className="rounded-xl" placeholder="Max players" />
          </div>
          <div>
            <Label>Team Plans & Goals</Label>
            <Textarea value={form.team_plans} onChange={(e) => handleChange("team_plans", e.target.value)} className="rounded-xl" placeholder="Tournaments, training focus, season goals — shown on the public signup page" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Internal Notes</Label>
            <Textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} className="rounded-xl" />
          </div>
          <Button onClick={handleSubmit} disabled={saving} className="w-full rounded-xl bg-primary hover:bg-primary/90">
            {saving ? "Saving…" : tryout ? "Save Changes" : "Create Tryout"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}