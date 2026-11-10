import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import { snapToMonday, toLabel } from "@/lib/gridEngine";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TYPES = [
  { value: "training", label: "Training", event: "practice" },
  { value: "game", label: "Game", event: "match" },
  { value: "camp", label: "Camp", event: "camp" },
  { value: "class", label: "Class", event: "class" },
  { value: "goalkeeping", label: "Goalkeeping", event: "goalkeeping" },
  { value: "small group", label: "Small Group", event: "small group" },
  { value: "other", label: "Other", event: "other" },
];

function timeToMin(t) {
  const m = /(\d{1,2}):(\d\d)/.exec(t || "");
  if (!m) return null;
  let h = +m[1];
  const ap = (t || "").match(/(am|pm)/i)?.[1]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return h * 60 + +m[2];
}
function minToDisplay(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function NewBookingDialog({ open, onClose, week, defaultFacility, onCreated }) {
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId;
  const [fields, setFields] = useState([]);
  const [teams, setTeams] = useState([]);
  const [billingOrgs, setBillingOrgs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fieldId: "", date: week, startTime: "18:00", endTime: "19:30",
    type: "training", teamName: "", awayTeamName: "", coachName: "", notes: "",
    billingScope: "internal", billingEntityId: "", billingRate: "",
  });

  useEffect(() => {
    if (!open || !clubId) return;
    base44.entities.Field.filter({ club_id: clubId }, { limit: 500 }).then((r) => setFields(r.items || []));
    base44.entities.Team.filter({ club_id: clubId }, { limit: 500 }).then((r) => setTeams(r.items || []));
    base44.entities.BillingEntity.filter({ club_id: clubId, status: "active" }, { limit: 200 })
      .then((r) => setBillingOrgs(r.items || []))
      .catch(() => {});
  }, [open, clubId]);

  const facilityFields = fields.filter((f) => !defaultFacility || f.facility_name === defaultFacility);
  const selectedField = fields.find((f) => f.id === form.fieldId);
  const billingOrg = billingOrgs.find((o) => o.id === form.billingEntityId);

  const submit = async () => {
    if (!form.fieldId || !form.date || !form.startTime || !form.endTime) return;
    setSaving(true);
    try {
      const sMin = timeToMin(form.startTime);
      const eMin = timeToMin(form.endTime);
      if (sMin == null || eMin == null || eMin <= sMin) { setSaving(false); return; }
      const typeMeta = TYPES.find((t) => t.value === form.type);
      const d = new Date(`${form.date}T00:00:00`);
      const team = form.type === "game" ? form.teamName : form.teamName;
      const identityKey = `${clubId}|${form.fieldId}|${form.date}|${sMin}|${eMin}|${typeMeta.event}|${team || typeMeta.label}`;
      await base44.entities.Booking.create({
        club_id: clubId,
        week_start: snapToMonday(form.date),
        field_id: form.fieldId,
        field_name: selectedField?.name || "",
        facility_name: selectedField?.facility_name || "",
        date: form.date,
        day: DAY_NAMES[d.getDay()],
        start_min: sMin, end_min: eMin,
        start_time: minToDisplay(sMin), end_time: minToDisplay(eMin),
        type: form.type, event_type: typeMeta.event,
        team_name: team || "",
        away_team_name: form.type === "game" ? form.awayTeamName : "",
        coach_name: form.coachName || "",
        notes: form.notes || "",
        source_ref: "manual",
        identity_key: identityKey,
        status: form.type === "game" ? "pending" : "confirmed",
        billing_scope: form.billingScope,
        ...(form.billingScope === "external"
          ? {
              billing_entity_id: form.billingEntityId,
              billing_entity_name: billingOrg?.name || "",
              billing_rate: Number(form.billingRate) || Number(billingOrg?.default_hourly_rate) || 0,
            }
          : {}),
      });
      onCreated?.();
      onClose?.();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Field Booking</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Field</Label>
            <Select value={form.fieldId} onValueChange={(v) => setForm({ ...form, fieldId: v })}>
              <SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>
                {(facilityFields.length ? facilityFields : fields).map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name} ({f.facility_name})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Start Time</Label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">End Time</Label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
          {form.type === "game" ? (
            <>
              <div>
                <Label className="text-xs">Home Team</Label>
                <Select value={form.teamName} onValueChange={(v) => setForm({ ...form, teamName: v })}>
                  <SelectTrigger><SelectValue placeholder="Select home team" /></SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Away Team</Label>
                <Input value={form.awayTeamName} onChange={(e) => setForm({ ...form, awayTeamName: e.target.value })} placeholder="Opponent name" />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label className="text-xs">Team / Group Name</Label>
                <Input value={form.teamName} onChange={(e) => setForm({ ...form, teamName: e.target.value })} placeholder="Team name or leave blank" />
              </div>
              <div>
                <Label className="text-xs">Coach</Label>
                <Input value={form.coachName} onChange={(e) => setForm({ ...form, coachName: e.target.value })} placeholder="Coach name" />
              </div>
            </>
          )}
          {billingOrgs.length > 0 && (
            <div className="border-t border-border pt-3 space-y-2">
              <Label className="text-xs">Billing</Label>
              <Select value={form.billingScope} onValueChange={(v) => setForm({ ...form, billingScope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Our own club — not invoiced</SelectItem>
                  <SelectItem value="external">Outside rental — invoice this organization</SelectItem>
                </SelectContent>
              </Select>
              {form.billingScope === "external" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Billed to</Label>
                    <Select value={form.billingEntityId} onValueChange={(v) => setForm({ ...form, billingEntityId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select organization" /></SelectTrigger>
                      <SelectContent>
                        {billingOrgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Rate / hour</Label>
                    <Input
                      type="number" min="0" step="0.01"
                      value={form.billingRate}
                      onChange={(e) => setForm({ ...form, billingRate: e.target.value })}
                      placeholder={billingOrg?.default_hourly_rate ? String(billingOrg.default_hourly_rate) : "0.00"}
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Outside rentals are invoiced to the organization on the 1st of the following month.
              </p>
            </div>
          )}
          <div>
            <Label className="text-xs">Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
          </div>
          {form.type === "game" && (
            <p className="text-xs text-amber-600">Game bookings start as pending. Teams are notified when you confirm the game.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={saving || !form.fieldId || !form.date || (form.billingScope === "external" && !form.billingEntityId)}
          >
            {saving ? "Saving..." : "Create Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}