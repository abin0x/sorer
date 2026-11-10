import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isSameDay, parseISO, addDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import MultiSelectFilter from "@/components/calendar/MultiSelectFilter";
import FieldBookingDialog from "@/components/facilities/FieldBookingDialog";
import ScheduleCalendarView from "@/components/schedule/ScheduleCalendarView";
import FacilityFieldView from "@/components/schedule/FacilityFieldView";
import MoveConfirmDialog from "@/components/schedule/MoveConfirmDialog";
import { FORMATS, computeConflicts } from "@/lib/fieldSections";

const GROUP_BY_OPTIONS = [
  { value: "field", label: "Field" },
  { value: "branch", label: "Branch" },
  { value: "gender", label: "Gender" },
  { value: "coach", label: "Coach" },
  { value: "platform", label: "Platform" },
];

export default function ScheduleView() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("calendar");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [groupBy, setGroupBy] = useState("field");
  const [dialog, setDialog] = useState({ open: false, booking: null });
  const [moveConfirm, setMoveConfirm] = useState(null);
  const [moving, setMoving] = useState(false);

  const [facilityIds, setFacilityIds] = useState([]);
  const [fieldIds, setFieldIds] = useState([]);
  const [formats, setFormats] = useState([]);
  const [branchIds, setBranchIds] = useState([]);
  const [genders, setGenders] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [platforms, setPlatforms] = useState([]);

  const { data: facilities = [] } = useQuery({ queryKey: ["facilities-manage"], queryFn: () => base44.entities.Facility.list("name", 200) });
  const { data: fields = [] } = useQuery({ queryKey: ["fields-manage"], queryFn: () => base44.entities.Field.list("name", 300) });
  const { data: locations = [] } = useQuery({ queryKey: ["locations-for-facilities"], queryFn: () => base44.entities.Location.list("name", 100) });
  const { data: teams = [] } = useQuery({ queryKey: ["teams-for-schedule"], queryFn: () => base44.entities.Team.list("name", 500) });
  const { data: events = [], isLoading } = useQuery({ queryKey: ["schedule-events"], queryFn: () => base44.entities.CalendarEvent.list("start_datetime", 2000) });

  const fieldsById = useMemo(() => Object.fromEntries(fields.map((f) => [f.id, f])), [fields]);
  const facilitiesById = useMemo(() => Object.fromEntries(facilities.map((f) => [f.id, f])), [facilities]);
  const teamsById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["schedule-events"] });
    queryClient.invalidateQueries({ queryKey: ["field-bookings"] });
  };

  // Enrich each booking with denormalized branch/gender/coach/platform via its field/facility/team
  const enrichedEvents = useMemo(() => {
    return events
      .filter((e) => e.field_id)
      .map((e) => {
        const field = fieldsById[e.field_id];
        const facility = (field && facilitiesById[field.facility_id]) || facilitiesById[e.facility_id];
        const team = e.team_ids?.[0] ? teamsById[e.team_ids[0]] : null;
        return {
          ...e,
          _facility: facility || null,
          _branch: facility?.location_name || "Unassigned",
          _branchId: facility?.location_id || "",
          _gender: team?.gender || "Unspecified",
          _coach: team?.coach_names?.[0] || team?.coach_name || "Unassigned",
          _platform: team?.platform_name || "Unassigned",
          _format: field?.format_supported?.includes("11v11") ? "11v11" : field?.format_supported?.[0] || "11v11",
        };
      });
  }, [events, fieldsById, facilitiesById, teamsById]);

  const dayEvents = useMemo(
    () => enrichedEvents.filter((e) => isSameDay(parseISO(e.start_datetime), selectedDate)),
    [enrichedEvents, selectedDate]
  );

  const filteredEvents = useMemo(() => {
    return dayEvents.filter((e) => {
      if (facilityIds.length && !facilityIds.includes(e._facility?.id)) return false;
      if (fieldIds.length && !fieldIds.includes(e.field_id)) return false;
      if (formats.length && !formats.includes(e._format)) return false;
      if (branchIds.length && !branchIds.includes(e._branchId)) return false;
      if (genders.length && !genders.includes(e._gender)) return false;
      if (coaches.length && !coaches.includes(e._coach)) return false;
      if (platforms.length && !platforms.includes(e._platform)) return false;
      return true;
    });
  }, [dayEvents, facilityIds, fieldIds, formats, branchIds, genders, coaches, platforms]);

  const conflictIds = useMemo(() => computeConflicts(dayEvents), [dayEvents]);
  const isConflict = (id) => conflictIds.has(id);

  const filteredFacilities = useMemo(
    () => (facilityIds.length ? facilities.filter((f) => facilityIds.includes(f.id)) : facilities),
    [facilities, facilityIds]
  );
  const filteredFields = useMemo(() => {
    return fields.filter((f) => {
      if (facilityIds.length && !facilityIds.includes(f.facility_id)) return false;
      if (fieldIds.length && !fieldIds.includes(f.id)) return false;
      if (formats.length && !formats.some((fmt) => f.format_supported?.includes(fmt))) return false;
      return true;
    });
  }, [fields, facilityIds, fieldIds, formats]);

  const eventsByField = useMemo(() => {
    const map = {};
    for (const e of filteredEvents) {
      if (!map[e.field_id]) map[e.field_id] = [];
      map[e.field_id].push(e);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    }
    return map;
  }, [filteredEvents]);

  const facilityOptions = facilities.map((f) => ({ value: f.id, label: f.name }));
  const fieldOptions = fields.map((f) => ({ value: f.id, label: f.name }));
  const branchOptions = locations.map((l) => ({ value: l.id, label: l.name }));
  const genderOptions = [{ value: "Boys", label: "Boys" }, { value: "Girls", label: "Girls" }];
  const coachOptions = useMemo(() => {
    const set = new Set(teams.map((t) => t.coach_names?.[0] || t.coach_name).filter(Boolean));
    return [...set].sort().map((c) => ({ value: c, label: c }));
  }, [teams]);
  const platformOptions = useMemo(() => {
    const set = new Set(teams.map((t) => t.platform_name).filter(Boolean));
    return [...set].sort().map((p) => ({ value: p, label: p }));
  }, [teams]);

  const handleDelete = async (id) => {
    try {
      await base44.entities.CalendarEvent.delete(id);
      refresh();
      toast.success("Booking deleted.");
    } catch { toast.error("Could not delete booking."); }
  };

  const handleRequestMove = (bookingId, fromFieldId, toFieldId) => {
    const event = enrichedEvents.find((e) => e.id === bookingId);
    const toField = fieldsById[toFieldId];
    if (!event || !toField) return;
    if (toField.status !== "active") {
      toast.error(`${toField.name} is ${toField.status} and can't accept bookings.`);
      return;
    }
    setMoveConfirm({ event, fromField: fieldsById[fromFieldId], toField });
  };

  const confirmMove = async () => {
    if (!moveConfirm) return;
    const { event, toField } = moveConfirm;
    const newFacility = facilitiesById[toField.facility_id];
    setMoving(true);
    try {
      await base44.entities.CalendarEvent.update(event.id, {
        field_id: toField.id,
        field_name: toField.name,
        facility_id: toField.facility_id || "",
        location_text: toField.name,
      });
      refresh();
      toast.success(`Moved to ${toField.name}${newFacility ? ` · ${newFacility.name}` : ""}.`);
      setMoveConfirm(null);
    } catch { toast.error("Could not move booking."); } finally { setMoving(false); }
  };

  const toggleFormat = (fmt) => setFormats((cur) => (cur.includes(fmt) ? cur.filter((f) => f !== fmt) : [...cur, fmt]));

  return (
    <div className="min-h-screen bg-white p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <div className="text-xs font-bold tracking-wider uppercase text-primary mb-1">Facility Management</div>
          <h1 className="text-2xl font-extrabold text-foreground">Schedule View</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse, filter, and drag-and-drop manage every field booking across all facilities.</p>
        </div>

        <div className="flex items-center gap-2 border-b border-border">
          <button onClick={() => setTab("calendar")} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors ${tab === "calendar" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <CalendarDays className="w-4 h-4" /> Calendar
          </button>
          <button onClick={() => setTab("field")} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors ${tab === "field" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <LayoutGrid className="w-4 h-4" /> Field View
          </button>
        </div>

        {/* Date navigation */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setSelectedDate((d) => addDays(d, -1))}><ChevronLeft className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSelectedDate(new Date())}>Today</Button>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setSelectedDate((d) => addDays(d, 1))}><ChevronRight className="w-4 h-4" /></Button>
            <span className="text-sm font-semibold text-foreground ml-2">{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
          </div>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs" onClick={() => setDialog({ open: true, booking: null })}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Booking
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <MultiSelectFilter label="Facilities" options={facilityOptions} selected={facilityIds} onChange={setFacilityIds} />
          <MultiSelectFilter label="Fields" options={fieldOptions} selected={fieldIds} onChange={setFieldIds} />
          <MultiSelectFilter label="Branches" options={branchOptions} selected={branchIds} onChange={setBranchIds} />
          <MultiSelectFilter label="Genders" options={genderOptions} selected={genders} onChange={setGenders} />
          <MultiSelectFilter label="Coaches" options={coachOptions} selected={coaches} onChange={setCoaches} />
          <MultiSelectFilter label="Platforms" options={platformOptions} selected={platforms} onChange={setPlatforms} />
          <div className="flex items-center gap-1 ml-1">
            {FORMATS.map((fmt) => (
              <button
                key={fmt}
                onClick={() => toggleFormat(fmt)}
                className={`text-xs px-2.5 py-1.5 rounded-md font-semibold border transition-colors ${
                  formats.includes(fmt) ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
          {tab === "calendar" && (
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-40 h-8 text-xs ml-auto"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GROUP_BY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>Group by {o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : tab === "calendar" ? (
          <ScheduleCalendarView events={filteredEvents} groupBy={groupBy} isConflict={isConflict} onEdit={(e) => setDialog({ open: true, booking: e })} onDelete={handleDelete} />
        ) : (
          <FacilityFieldView
            facilities={filteredFacilities}
            fields={filteredFields}
            eventsByField={eventsByField}
            isConflict={isConflict}
            onEdit={(e) => setDialog({ open: true, booking: e })}
            onDelete={handleDelete}
            onAddBooking={() => setDialog({ open: true, booking: null })}
            onRequestMove={handleRequestMove}
          />
        )}
      </div>

      <FieldBookingDialog open={dialog.open} onOpenChange={(v) => setDialog({ open: v, booking: null })} booking={dialog.booking} onSaved={refresh} />
      <MoveConfirmDialog moveConfirm={moveConfirm} onCancel={() => setMoveConfirm(null)} onConfirm={confirmMove} saving={moving} />
    </div>
  );
}