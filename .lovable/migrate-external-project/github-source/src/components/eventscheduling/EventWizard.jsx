import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Check, ChevronRight, ChevronLeft, Plus, X, MapPin } from "lucide-react";
import DateSelectionCalendar from "@/components/events/DateSelectionCalendar";
import RecurringScheduleEditor from "@/components/events/RecurringScheduleEditor";
import { recurringDatePreview } from "@/components/events/recurringDatePreview";
import { format } from "date-fns";
import EventRegistrationSettings from "@/components/events/EventRegistrationSettings";

const STEPS = ["Details", "Event Dates", "Groups & Sessions", "Review"];

export default function EventWizard({ clubId, user, onClose, onCreated, includeRegistration = false }) {
  const { toast } = useToast();
  const [registration, setRegistration] = useState({ type: "camp", price: 0, capacity: 0, is_public: true, allow_waitlist: true, registration_opens: "", registration_closes: "" });
  const requestClose = () => {
    if (saving) return;
    if ((!title.trim() && step === 0) || window.confirm("Discard this event and its unsaved schedule?")) onClose();
  };
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1: Details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState("recurring");
  const [timezone, setTimezone] = useState("America/New_York");

  // Step 2: Schedule
  const [dtstart, setDtstart] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [excludedDates, setExcludedDates] = useState([]);
  const [addedDates, setAddedDates] = useState([]);
  const [freq, setFreq] = useState("WEEKLY");
  const [byday, setByday] = useState(["MO", "WE"]);
  const [until, setUntil] = useState("");
  const [multiDates, setMultiDates] = useState([]);
  const [singleDate, setSingleDate] = useState("");

  // Step 3: Locations/Fields (managed by LocationFieldManager, stores IDs here)
  const [locations, setLocations] = useState([]); // fetched EventLocation list
  const [fields, setFields] = useState([]); // fetched EventField list
  React.useEffect(() => {
    if (!clubId) return;
    let active = true;
    Promise.all([base44.entities.EventLocation.filter({ club_id: clubId }), base44.entities.EventField.filter({ club_id: clubId })]).then(([locs, flds]) => { if (active) { setLocations(locs); setFields(flds); } });
    return () => { active = false; };
  }, [clubId]);

  // Step 4: Groups + Session templates
  const [groups, setGroups] = useState([{ name: "All Participants", color: "#6366F1" }]);
  const [sessions, setSessions] = useState([{ name: "Session 1", start_time: "09:00", end_time: "10:30", location_id: "", field_id: "", capacity: 0, group_ids: ["All Participants"] }]);

  const recurringDates = [...new Set([...recurringDatePreview(dtstart, until, freq, byday), ...addedDates])].filter((d) => !excludedDates.includes(d)).sort();

  const buildRrule = () => {
    if (eventType === "single") return "";
    if (eventType === "multi_date") return "";
    let r = `FREQ=${freq}`;
    if (freq === "WEEKLY" && byday.length) r += `;BYDAY=${byday.join(",")}`;
    if (until) r += `;UNTIL=${until.replace(/-/g, "")}T235959Z`;
    return r;
  };

  const canNext = () => {
    if (step === 0) return title.trim().length > 0;
    if (step === 1) {
      if (eventType === "single") return !!singleDate;
      if (eventType === "multi_date") return multiDates.length > 0;
      return !!dtstart && (!until || until >= dtstart) && recurringDates.length > 0 && (freq !== "WEEKLY" || byday.length > 0);
    }
    if (step === 2) return groups.every((g) => g.name.trim()) && new Set(groups.map((g) => g.name.trim())).size === groups.length && sessions.every((s) => s.name.trim() && s.start_time && s.end_time && s.end_time > s.start_time && s.group_ids.length > 0);
    return true;
  };

  const handlePublish = async (publish) => {
    if (!title.trim() || !clubId) { toast({ title: "An event title and selected club are required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      // 1. Create the Event
      const startDate = eventType === "single" ? singleDate : (eventType === "multi_date" ? (multiDates[0] || dtstart) : dtstart);
      const event = await base44.entities.Event.create({
        club_id: clubId,
        title,
        description,
        organizer_id: user?.id || "",
        organizer_name: user?.full_name || "",
        event_type: eventType,
        timezone,
        status: publish ? "published" : "draft",
        session_templates: sessions.map((s) => ({ ...s, group_ids: s.group_ids })),
      });

      // 2. Create Groups
      const createdGroups = await base44.entities.Group.bulkCreate(
        groups.map((g) => ({ club_id: clubId, event_id: event.id, name: g.name, color: g.color || "#6366F1" }))
      );
      // Map group names to IDs for session templates
      const groupIdByName = {};
      createdGroups.forEach((g, i) => { groupIdByName[groups[i].name] = g.id; });

      // 3. Update session templates with resolved group IDs
      const templatesWithGroupIds = sessions.map((s) => ({
        ...s,
        group_ids: (s.group_ids || []).map((name) => groupIdByName[name]).filter(Boolean),
      }));
      await base44.entities.Event.update(event.id, { session_templates: templatesWithGroupIds });

      // 4. Create the RecurrenceRule (triggers the Expand Recurrence workflow)
      if (eventType === "recurring" || eventType === "multi_date") {
        const rruleString = buildRrule();
        const rdates = JSON.stringify(eventType === "multi_date" ? multiDates : addedDates);
        await base44.entities.RecurrenceRule.create({
          club_id: clubId,
          event_id: event.id,
          rrule_string: rruleString,
          dtstart: new Date(startDate + "T09:00:00").toISOString(),
          until: eventType === "recurring" && until ? new Date(until + "T23:59:59").toISOString() : "",
          exdates: JSON.stringify(eventType === "recurring" ? excludedDates : []),
          rdates,
        });
      } else if (eventType === "single") {
        // Single event — create one occurrence directly
        await base44.entities.EventOccurrence.create({
          club_id: clubId,
          event_id: event.id,
          occurrence_date: singleDate,
          timezone,
          status: "scheduled",
          is_override: false,
        });
        // Create sessions for the single occurrence
        if (sessions.length > 0) {
          // We need the occurrence ID, so fetch it
          const occs = await base44.entities.EventOccurrence.filter({ event_id: event.id });
          if (occs.length > 0) {
            const createdSessions = await base44.entities.Session.bulkCreate(
              sessions.map((s) => ({
                club_id: clubId,
                occurrence_id: occs[0].id,
                name: s.name,
                start_time: s.start_time,
                end_time: s.end_time,
                location_id: s.location_id || "",
                field_id: s.field_id || "",
                capacity: s.capacity || 0,
                status: "scheduled",
              }))
            );
            // Create GroupSessions
            const groupSessions = [];
            createdSessions.forEach((s, i) => {
              for (const gname of (sessions[i].group_ids || [])) {
                const gid = groupIdByName[gname];
                if (gid) groupSessions.push({ club_id: clubId, group_id: gid, session_id: s.id, notes: "" });
              }
            });
            if (groupSessions.length > 0) await base44.entities.GroupSession.bulkCreate(groupSessions);
          }
        }
      }

      if (includeRegistration) {
        await base44.entities.ClubEvent.create({
          ...registration, club_id: clubId, name: title, description,
          start_date: startDate,
          ...(eventType === "multi_date" ? { end_date: multiDates[multiDates.length - 1] } : eventType === "single" ? { end_date: singleDate } : until ? { end_date: until } : {}),
          start_time: sessions[0]?.start_time || "", end_time: sessions[0]?.end_time || "",
          location: locations.find((l) => l.id === sessions[0]?.location_id)?.name || "",
          status: publish ? "open" : "draft", scheduling_event_id: event.id, schedule_type: eventType,
        });
      }
      toast({ title: publish ? "Event published" : "Draft saved", description: "The event, groups, and session templates are saved. Scheduled dates are being generated." });
      onCreated(event);
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to save event", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => { e.preventDefault(); if (!e.target.closest?.("[data-event-calendar]")) requestClose(); }}>
        <DialogHeader>
          <DialogTitle>{includeRegistration ? "Create New Event" : "Create Event Series"}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex flex-wrap items-center gap-1 mb-4">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {i < step && <Check className="w-3 h-3" />}{s}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 0: Details */}
        {step === 0 && (
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fall Training Program" /></div>
            <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Schedule Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Day</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                    <SelectItem value="multi_date">Multiple Days / Dates</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "UTC"].map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {includeRegistration && <EventRegistrationSettings value={registration} onChange={setRegistration} />}
          </div>
        )}

        {/* Step 1: Schedule */}
        {step === 1 && (
          <div className="space-y-4">
            {eventType === "single" && (
              <div><Label>Date *</Label><Input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} /></div>
            )}
            {eventType === "recurring" && <RecurringScheduleEditor start={dtstart} setStart={setDtstart} end={until} setEnd={setUntil} frequency={freq} setFrequency={setFreq} weekdays={byday} setWeekdays={setByday} excluded={excludedDates} setExcluded={setExcludedDates} added={addedDates} setAdded={setAddedDates} sessionCount={sessions.length} />}
            {eventType === "multi_date" && <DateSelectionCalendar dates={multiDates} onChange={setMultiDates} sessionCount={sessions.length} />}
          </div>
        )}

        {/* Groups & Sessions: locations and fields are selected only here. */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2"><Label>Groups</Label>
                <Button size="sm" variant="outline" onClick={() => setGroups((p) => [...p, { name: `Group ${p.length + 1}`, color: "#6366F1" }])}><Plus className="w-3 h-3" /> Add Group</Button>
              </div>
              <div className="space-y-2">
                {groups.map((g, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={g.name} onChange={(e) => { const name = e.target.value; setSessions((p) => p.map((s) => ({ ...s, group_ids: s.group_ids.map((n) => n === g.name ? name : n) }))); setGroups((p) => p.map((x, j) => j === i ? { ...x, name } : x)); }} className="flex-1" />
                    <input type="color" value={g.color} onChange={(e) => setGroups((p) => p.map((x, j) => j === i ? { ...x, color: e.target.value } : x))} className="w-9 h-9 rounded border cursor-pointer" />
                    {groups.length > 1 && <Button size="icon" variant="ghost" onClick={() => { setSessions((p) => p.map((s) => ({ ...s, group_ids: s.group_ids.filter((n) => n !== g.name) }))); setGroups((p) => p.filter((_, j) => j !== i)); }}><X className="w-4 h-4" /></Button>}
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2"><Label>Session Templates</Label>
                <Button size="sm" variant="outline" onClick={() => setSessions((p) => [...p, { name: `Session ${p.length + 1}`, start_time: "09:00", end_time: "10:30", location_id: "", field_id: "", capacity: 0, group_ids: [] }])}><Plus className="w-3 h-3" /> Add Session</Button>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Each session repeats on every scheduled date. Select at least one group for each session. Group names must be unique, and end times must follow start times.</p>
              <div className="space-y-3">
                {sessions.map((s, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Input value={s.name} onChange={(e) => setSessions((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="flex-1" placeholder="Session name" />
                      {sessions.length > 1 && <Button size="icon" variant="ghost" onClick={() => setSessions((p) => p.filter((_, j) => j !== i))}><X className="w-4 h-4" /></Button>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">Start</Label><Input type="time" value={s.start_time} onChange={(e) => setSessions((p) => p.map((x, j) => j === i ? { ...x, start_time: e.target.value } : x))} /></div>
                      <div><Label className="text-xs">End</Label><Input type="time" value={s.end_time} onChange={(e) => setSessions((p) => p.map((x, j) => j === i ? { ...x, end_time: e.target.value } : x))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs">Location</Label>
                        <Select value={s.location_id} onValueChange={(v) => setSessions((p) => p.map((x, j) => j === i ? { ...x, location_id: v, field_id: "" } : x))}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Field</Label>
                        <Select value={s.field_id} onValueChange={(v) => setSessions((p) => p.map((x, j) => j === i ? { ...x, field_id: v } : x))}>
                          <SelectTrigger className="text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>{fields.filter((f) => !s.location_id || f.location_id === s.location_id).map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label className="text-xs">Capacity</Label><Input type="number" value={s.capacity} onChange={(e) => setSessions((p) => p.map((x, j) => j === i ? { ...x, capacity: Number(e.target.value) } : x))} /></div>
                    <div><Label className="text-xs">Assign Groups</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {groups.map((g, gi) => {
                          const checked = (s.group_ids || []).includes(g.name);
                          return (
                            <label key={gi} className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <Checkbox checked={checked} onCheckedChange={(c) => setSessions((p) => p.map((x, j) => j === i ? { ...x, group_ids: c ? [...(x.group_ids || []), g.name] : (x.group_ids || []).filter((n) => n !== g.name) } : x))} />
                              <span style={{ color: g.color }}>{g.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Review */}
        {step === 3 && (
          <div className="space-y-3 text-sm">
            <div className="font-medium text-base mb-1">Review</div>
            <div><span className="text-muted-foreground">Title:</span> {title}</div>
            <div><span className="text-muted-foreground">Schedule:</span> {eventType === "multi_date" ? "Multiple days / dates" : eventType === "recurring" ? "Recurring" : "Single day"}</div>
            <div><span className="text-muted-foreground">Timezone:</span> {timezone}</div>
            {eventType === "recurring" && <div><span className="text-muted-foreground">Repeats:</span> {freq.toLowerCase()}{freq === "WEEKLY" ? ` on ${byday.join(", ")}` : ""}. {recurringDates.length} dates in this preview{until ? `, ending ${until}` : ", continuing on a rolling schedule"}.</div>}
            {eventType === "multi_date" && <div><span className="text-muted-foreground">Dates:</span> {multiDates.join(", ")}</div>}
            {eventType === "single" && <div><span className="text-muted-foreground">Date:</span> {singleDate}</div>}
            <div><span className="text-muted-foreground">Groups:</span> {groups.map((g) => g.name).join(", ")}</div>
            <div><span className="text-muted-foreground">Sessions:</span> {sessions.length} template(s)</div>
            {includeRegistration && <div><span className="text-muted-foreground">Registration:</span> ${registration.price} for the entire event; {registration.capacity || "unlimited"} places</div>}
            <div><span className="text-muted-foreground">Locations:</span> {[...new Set(sessions.map((s) => locations.find((l) => l.id === s.location_id)?.name).filter(Boolean))].join(", ") || "Not specified"}</div>
            <p className="text-xs text-muted-foreground mt-2">Publishing generates occurrences and sessions immediately. Saving as draft lets you publish later from the detail view.</p>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <Button variant="ghost" disabled={saving} onClick={step === 0 ? requestClose : () => setStep((s) => s - 1)}><ChevronLeft className="w-4 h-4" /> Back</Button>
          <div className="flex gap-2">
            {step < STEPS.length - 1 && <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>Next <ChevronRight className="w-4 h-4" /></Button>}
            {step === STEPS.length - 1 && (
              <>
                <Button variant="outline" onClick={() => handlePublish(false)} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Draft</Button>
                <Button onClick={() => handlePublish(true)} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Publish</Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}