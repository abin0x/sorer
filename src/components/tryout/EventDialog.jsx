import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Star } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateEventTasks, resolveStaffByRole } from "@/lib/tryoutAutomation";
import { detectConflicts } from "@/lib/tryoutDay";
import { createSession } from "@/lib/tryoutSessions";
import ConflictWarnings from "@/components/tryout/ConflictWarnings";
import MultiSelectDropdown from "@/components/communication/MultiSelectDropdown";
import { toast } from "sonner";

const EMPTY_FORM = {
  type: "main_tryout",
  date: "",
  start_time: "",
  end_time: "",
  location: "",
  field_id: "",
  field_name: "",
  capacity: "",
  evaluator_ids: [],
  evaluator_names: [],
  responsible_user_id: "",
  owner_user_id: "",
  expected_attendance: "",
  auto_registration: true,
  notes: "",
};

/**
 * Creates or edits one tryout session (a TryoutEvent).
 * props.forceType locks a new session to a single event type.
 * props.editEvent loads an existing session for editing.
 * props.initial pre-fills a new session (used by "duplicate session").
 */
export default function EventDialog({
  open,
  plan,
  staff = [],
  events = [],
  forceType,
  editEvent,
  initial,
  onClose,
  onCreated,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: fields = [] } = useQuery({
    queryKey: ["fields-for-session"],
    queryFn: () => base44.entities.Field.list("name", 200),
    enabled: !!open,
  });

  const mainTryout = events.find((e) => e.type === "main_tryout");
  const evaluatorNames = React.useMemo(
    () => Object.fromEntries(staff.map((s) => [s.user_id, s.user_name || s.user_email || "Coach"])),
    [staff]
  );
  const conflicts = form.date
    ? detectConflicts(events, form, editEvent?.id, { plan, evaluatorNames })
    : [];

  React.useEffect(() => {
    if (!open) return;
    if (editEvent) {
      setForm({ ...EMPTY_FORM, ...editEvent });
    } else if (initial) {
      setForm({ ...EMPTY_FORM, ...initial, owner_user_id: initial.owner_user_id ?? plan?.lead_user_id ?? "" });
    } else {
      setForm({
        ...EMPTY_FORM,
        type: forceType || (mainTryout ? "open_training" : "main_tryout"),
        owner_user_id: plan?.lead_user_id || "",
      });
    }
    setError("");
  }, [open]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const selectField = (id) => {
    const field = (fields || []).find((f) => f.id === id);
    const label = field ? [field.name, field.facility_name].filter(Boolean).join(" — ") : "";
    setForm((f) => ({ ...f, field_id: id, field_name: label, location: label || f.location }));
  };

  const setEvaluators = (ids) =>
    setForm((f) => ({
      ...f,
      evaluator_ids: ids,
      evaluator_names: ids.map((id) => evaluatorNames[id] || "Coach"),
    }));

  const validateOrder = () => {
    if (!mainTryout || editEvent) return "";
    if (form.type === "open_training" && form.date >= mainTryout.date) {
      return "Open Training must be before the Main Club Tryout Date.";
    }
    if (form.type === "supplemental_tryout" && form.date <= mainTryout.date) {
      return "Supplemental Tryouts must be after the Main Club Tryout Date.";
    }
    return "";
  };

  const handleSave = async () => {
    if (!form.date) return;
    const orderError = validateOrder();
    if (orderError) {
      setError(orderError);
      return;
    }
    if (conflicts.length > 0) {
      setError("Please resolve the field, coach and capacity conflicts before saving this session.");
      return;
    }
    setError("");
    setSaving(true);

    const responsible = staff.find((s) => s.user_id === form.responsible_user_id);
    const owner = staff.find((s) => s.user_id === form.owner_user_id);
    const values = {
      ...form,
      responsible_name: responsible?.user_name || responsible?.user_email || "",
      owner_name: owner?.user_name || owner?.user_email || "",
    };

    if (editEvent) {
      await base44.entities.TryoutEvent.update(editEvent.id, {
        date: values.date,
        start_time: values.start_time,
        end_time: values.end_time,
        location: values.location,
        field_id: values.field_id,
        field_name: values.field_name,
        branch_id: editEvent.branch_id || (plan?.location_ids || [])[0] || "",
        branch_name: editEvent.branch_name || (plan?.location_names || [])[0] || "",
        capacity: values.capacity ? Number(values.capacity) : undefined,
        evaluator_ids: values.evaluator_ids,
        evaluator_names: values.evaluator_names,
        responsible_user_id: values.responsible_user_id,
        responsible_name: values.responsible_name || editEvent.responsible_name || "",
        owner_user_id: values.owner_user_id,
        owner_name: values.owner_name || editEvent.owner_name || "",
        notes: values.notes,
      });
      const moved =
        values.date !== editEvent.date ||
        values.start_time !== editEvent.start_time ||
        values.end_time !== editEvent.end_time ||
        values.location !== editEvent.location;
      if (moved && (editEvent.registration_count || 0) > 0) {
        await base44.functions
          .invoke("tryoutNotify", {
            event_id: editEvent.id,
            type: "changed",
            changes: { date: values.date, time: values.start_time, location: values.location },
          })
          .catch(() => {});
        toast.success("Session updated — registered families notified of the change");
      } else {
        toast.success("Session updated");
      }
    } else {
      const supplementalIndex =
        values.type === "supplemental_tryout"
          ? events.filter((e) => e.type === "supplemental_tryout").length + 1
          : undefined;
      const event = await createSession(plan, { ...values, supplemental_index: supplementalIndex });
      await generateEventTasks({ event, plan, staffByRole: resolveStaffByRole(staff) });
      toast.success("Session created");
    }

    setSaving(false);
    setForm(EMPTY_FORM);
    onCreated();
  };

  if (!open) return null;

  const isMain = form.type === "main_tryout";
  const canPickType = !forceType && !!mainTryout && !editEvent;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isMain && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
            {editEvent
              ? "Edit Session"
              : isMain
              ? "Main Club Tryout Date"
              : form.type === "open_training"
              ? "New Open Training"
              : "New Supplemental Tryout"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isMain && !editEvent && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ★ The epicenter of the tryout plan — Schedule the main tryout date and add open training sessions and supplemental tryouts.
            </p>
          )}

          {canPickType && (
            <div className="space-y-1.5">
              <Label>Event Type</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open_training">Open Training (before main tryout)</SelectItem>
                  <SelectItem value="supplemental_tryout">Supplemental Tryout (after main tryout)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Start time</Label>
              <Input type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End time</Label>
              <Input type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} />
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">{error}</p>
          )}

          {conflicts.length > 0 && <ConflictWarnings conflicts={conflicts} />}

          <div className="space-y-1.5">
            <Label>Field</Label>
            <Select value={form.field_id} onValueChange={selectField}>
              <SelectTrigger><SelectValue placeholder="Select a field" /></SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {[f.name, f.facility_name].filter(Boolean).join(" — ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fields.length === 0 && (
              <p className="text-xs text-muted-foreground">No fields set up yet — describe the venue below instead.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Field / facility name" />
          </div>

          <div className="space-y-1.5">
            <Label>Session capacity</Label>
            <Input
              type="number"
              min="0"
              value={form.capacity}
              onChange={(e) => set("capacity", e.target.value)}
              placeholder={plan?.max_capacity ? `Defaults to the tryout's ${plan.max_capacity}` : "Max players"}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Evaluators</Label>
            <MultiSelectDropdown
              label="Select coaches"
              options={staff.map((s) => ({ value: s.user_id, label: s.user_name || s.user_email || "Unknown" }))}
              selected={form.evaluator_ids}
              onChange={setEvaluators}
              searchable
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Responsible coach</Label>
              <Select value={form.responsible_user_id} onValueChange={(v) => set("responsible_user_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.user_id} value={s.user_id}>{s.user_name || s.user_email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select value={form.owner_user_id} onValueChange={(v) => set("owner_user_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.user_id} value={s.user_id}>{s.user_name || s.user_email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isMain && (
            <div className="space-y-1.5">
              <Label>Expected attendance</Label>
              <Input type="number" min="0" value={form.expected_attendance} onChange={(e) => set("expected_attendance", e.target.value)} placeholder="e.g. 60" />
            </div>
          )}

          {!editEvent && (
            <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Auto-create registration page</p>
                <p className="text-xs text-muted-foreground">Generates a public signup link for this session</p>
              </div>
              <Switch checked={form.auto_registration} onCheckedChange={(v) => set("auto_registration", v)} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.date}>
            {saving ? "Saving…" : editEvent ? "Save Changes" : isMain ? "Create Main Tryout" : "Create Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}