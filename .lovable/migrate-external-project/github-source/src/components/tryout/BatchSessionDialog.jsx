import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CalendarPlus } from "lucide-react";
import { detectConflicts } from "@/lib/tryoutDay";
import { createSession } from "@/lib/tryoutSessions";
import { generateEventTasks, resolveStaffByRole } from "@/lib/tryoutAutomation";
import MultiSelectDropdown from "@/components/communication/MultiSelectDropdown";
import { toast } from "sonner";

const WEEKDAYS = [
  { day: 1, label: "Mon" },
  { day: 2, label: "Tue" },
  { day: 3, label: "Wed" },
  { day: 4, label: "Thu" },
  { day: 5, label: "Fri" },
  { day: 6, label: "Sat" },
  { day: 0, label: "Sun" },
];

const iso = (d) => d.toISOString().slice(0, 10);

/**
 * Bulk-creates tryout sessions across a date range, one per selected weekday.
 * Each session's type follows the plan's ordering rules — sessions before the
 * Main Club Tryout Date are Open Training, sessions after it are Supplemental
 * Tryouts, and when the plan has no main tryout yet the last date becomes it.
 * Sessions that clash with an existing booking are listed and skipped.
 */
export default function BatchSessionDialog({ open, plan, events = [], staff = [], onClose, onCreated }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weekdays, setWeekdays] = useState([1, 3]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [capacity, setCapacity] = useState("");
  const [evaluatorIds, setEvaluatorIds] = useState([]);
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: fields = [] } = useQuery({
    queryKey: ["fields-for-session"],
    queryFn: () => base44.entities.Field.list("name", 200),
    enabled: !!open,
  });

  const evaluatorNames = useMemo(
    () => Object.fromEntries(staff.map((s) => [s.user_id, s.user_name || s.user_email || "Coach"])),
    [staff]
  );

  const mainTryout = events.find((e) => e.type === "main_tryout");

  const dates = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return [];
    const out = [];
    const d = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    while (d <= end && out.length < 60) {
      if (weekdays.includes(d.getDay())) out.push(iso(d));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [startDate, endDate, weekdays]);

  const field = (fields || []).find((f) => f.id === fieldId);
  const fieldLabel = field ? [field.name, field.facility_name].filter(Boolean).join(" — ") : "";
  const mainDate = mainTryout?.date || dates[dates.length - 1] || "";

  const preview = useMemo(() => {
    let supplemental = events.filter((e) => e.type === "supplemental_tryout").length;
    return dates.map((date) => {
      let type = "open_training";
      if (date === mainDate && !mainTryout) type = "main_tryout";
      else if (date > mainDate) type = "supplemental_tryout";
      const values = {
        type,
        date,
        start_time: startTime,
        end_time: endTime,
        field_id: fieldId,
        field_name: fieldLabel,
        location: fieldLabel,
        capacity,
        evaluator_ids: evaluatorIds,
        evaluator_names: evaluatorIds.map((id) => evaluatorNames[id] || "Coach"),
        responsible_user_id: responsibleUserId,
        responsible_name: staff.find((s) => s.user_id === responsibleUserId)?.user_name || "",
        auto_registration: true,
      };
      const conflicts = detectConflicts(events, values, null, { plan, evaluatorNames });
      if (mainTryout && date === mainDate) {
        conflicts.push({ type: "window", message: "This date is the Main Club Tryout Date — pick another day" });
      }
      if (type === "supplemental_tryout") supplemental += 1;
      return { date, type, conflicts, values: { ...values, supplemental_index: type === "supplemental_tryout" ? supplemental : undefined } };
    });
  }, [dates, mainDate, mainTryout, startTime, endTime, fieldId, fieldLabel, capacity, evaluatorIds, responsibleUserId, events, plan, staff, evaluatorNames]);

  const ready = preview.filter((p) => p.conflicts.length === 0);
  const blocked = preview.filter((p) => p.conflicts.length > 0);

  const typeLabel = (t) => (t === "main_tryout" ? "★ Main tryout" : t === "open_training" ? "Open training" : "Supplemental");

  const handleCreate = async () => {
    if (ready.length === 0) return;
    setSaving(true);
    const staffByRole = resolveStaffByRole(staff);
    for (const session of ready) {
      const event = await createSession(plan, session.values);
      await generateEventTasks({ event, plan, staffByRole });
    }
    setSaving(false);
    toast.success(`${ready.length} session${ready.length === 1 ? "" : "s"} created${blocked.length ? ` · ${blocked.length} skipped over conflicts` : ""}`);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-4 h-4" /> Bulk add sessions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Days</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((w) => {
                const on = weekdays.includes(w.day);
                return (
                  <button
                    key={w.day}
                    type="button"
                    onClick={() => setWeekdays((prev) => (on ? prev.filter((d) => d !== w.day) : [...prev, w.day]))}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium min-h-[44px] select-none transition-colors ${
                      on ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Field</Label>
            <Select value={fieldId} onValueChange={setFieldId}>
              <SelectTrigger><SelectValue placeholder="Select a field" /></SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {[f.name, f.facility_name].filter(Boolean).join(" — ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Capacity per session</Label>
              <Input type="number" min="0" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Max players" />
            </div>
            <div className="space-y-1.5">
              <Label>Responsible coach</Label>
              <Select value={responsibleUserId} onValueChange={setResponsibleUserId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.user_id} value={s.user_id}>{s.user_name || s.user_email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Evaluators</Label>
            <MultiSelectDropdown
              label="Select coaches"
              options={staff.map((s) => ({ value: s.user_id, label: s.user_name || s.user_email || "Unknown" }))}
              selected={evaluatorIds}
              onChange={setEvaluatorIds}
              searchable
            />
          </div>

          {!mainTryout && dates.length > 0 && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              This plan has no Main Club Tryout Date yet, so the last session ({mainDate}) is created as the ★ Main Club Tryout Date and the earlier dates as Open Training.
            </p>
          )}

          {preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                {preview.length} session{preview.length === 1 ? "" : "s"} from this range
                {blocked.length > 0 ? ` · ${blocked.length} with conflicts, skipped` : ""}
              </p>
              <div className="max-h-56 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {preview.map((p) => (
                  <div key={p.date} className="flex items-center gap-2 p-2.5">
                    <span className="text-sm font-medium w-28 shrink-0">{p.date}</span>
                    <span className="text-xs text-muted-foreground w-24 shrink-0">
                      {p.values.start_time ? `${p.values.start_time}–${p.values.end_time || ""}` : "Time not set"}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0">{typeLabel(p.type)}</Badge>
                    <span className="flex-1 min-w-0 text-xs text-amber-800 truncate">
                      {p.conflicts.map((c) => c.message).join(" · ")}
                    </span>
                  </div>
                ))}
              </div>
              {blocked.length > 0 && (
                <p className="text-xs text-amber-800 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Fix the field or coach clashes above, then run it again for those dates.
                </p>
              )}
            </div>
          )}

          {dates.length === 0 && startDate && endDate && (
            <p className="text-xs text-muted-foreground">No dates in this range fall on the selected days, or the range is reversed.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || ready.length === 0}>
            {saving ? "Creating…" : `Create ${ready.length} session${ready.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}