import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CalendarDays, MapPin, User, Link as LinkIcon, Users, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { recalcTaskProgress } from "@/lib/tryoutAutomation";
import { deleteSession } from "@/lib/tryoutSessions";
import { EVENT_TYPE_META } from "@/lib/tryoutDefaults";
import SearchableSelect from "@/components/tryout/SearchableSelect";
import PromoteThisButton from "@/components/marketing/PromoteThisButton";
import { fromTryout } from "@/lib/marketing/events";
import { useTenant } from "@/lib/TenantContext";

export default function EventDetailDialog({ event, teams, staff = [], onClose, onDeleted }) {
  const queryClient = useQueryClient();
  const { effectiveClubId } = useTenant();

  const { data: task } = useQuery({
    queryKey: ["tryoutTask", event?.id],
    queryFn: () => base44.entities.TryoutTask.filter({ tryout_event_id: event.id }).then((r) => r[0] || null),
    enabled: !!event,
  });

  const { data: subtasks = [] } = useQuery({
    queryKey: ["tryoutSubtasks", task?.id],
    queryFn: () => base44.entities.TryoutSubtask.filter({ tryout_task_id: task.id }),
    enabled: !!task,
  });

  if (!event) return null;

  const meta = EVENT_TYPE_META[event.type] || EVENT_TYPE_META.open_training;
  const isMain = event.type === "main_tryout";
  const eventTeams = teams.filter((t) => event.team_ids?.includes(t.id));

  const invalidateSubtasks = () => {
    queryClient.invalidateQueries({ queryKey: ["tryoutSubtasks", task?.id] });
    queryClient.invalidateQueries({ queryKey: ["tryoutTask", event.id] });
    queryClient.invalidateQueries({ queryKey: ["tryoutEvents"] });
  };

  const toggleSubtask = async (subtask) => {
    const nextStatus = subtask.status === "completed" ? "pending" : "completed";
    await base44.entities.TryoutSubtask.update(subtask.id, { status: nextStatus });
    if (task) await recalcTaskProgress(task.id);
    invalidateSubtasks();
  };

  const assignSubtask = async (subtask, userId) => {
    const person = staff.find((s) => s.user_id === userId);
    if (!person) return;
    await base44.entities.TryoutSubtask.update(subtask.id, {
      assignee_id: person.user_id,
      assignee_name: person.user_name || person.user_email || "",
    });
    invalidateSubtasks();

    if (person.user_email) {
      try {
        await base44.functions.invoke("sendEmail", {
          to: person.user_email,
          subject: `Task assigned: ${subtask.title}`,
          body:
            `Hi ${person.user_name || ""},\n\n` +
            `You've been assigned a tryout task for the ${meta.label.replace("★ ", "")} on ${event.date}${event.location ? ` at ${event.location}` : ""}.\n\n` +
            `Task: ${subtask.title}\n` +
            `Due date: ${subtask.due_date || "Not set"}\n\n` +
            `Please complete this task by the due date to keep the tryout on track.\n\nThanks!`,
        });
        toast.success(`Assigned to ${person.user_name || person.user_email} — email sent`);
      } catch (e) {
        toast.error("Assigned, but the notification email failed to send.");
      }
    } else {
      toast.success(`Assigned to ${person.user_name || "staff member"}`);
    }
  };

  const handleDelete = async () => {
    if (isMain) {
      toast.error("The Main Club Tryout Date can't be deleted without a replacement. Create a new Main Club Tryout Date first, then delete this one.");
      return;
    }
    if (!window.confirm(`Delete this ${meta.label.replace("★ ", "")}? This will also remove its task and subtasks. Registered families will be notified.`)) return;
    await deleteSession(event);
    toast.success("Event deleted — registered families notified");
    onDeleted?.();
  };

  return (
    <Dialog open={!!event} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[90vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isMain && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
            {meta.label} — {event.date}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5 text-sm">
            <p className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-muted-foreground" /> {event.date}{event.start_time ? ` · ${event.start_time}–${event.end_time || ""}` : ""}</p>
            {event.location && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /> {event.location}</p>}
            {event.responsible_name && <p className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /> Responsible: {event.responsible_name}</p>}
            {event.owner_name && <p className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /> Owner: {event.owner_name}</p>}
            {event.registration_url && (
              <p className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-muted-foreground" />
                <a href={event.registration_url} target="_blank" rel="noreferrer" className="text-primary underline truncate">{event.registration_url}</a>
              </p>
            )}
            <p className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              {event.registration_count || 0} registered{event.expected_attendance ? ` / ${event.expected_attendance} expected` : ""}
            </p>
            {isMain && (
              <p className="flex items-center gap-2 text-muted-foreground text-xs">
                {event.checked_in_count || 0} checked-in · {event.evaluated_count || 0} evaluated · {event.accepted_count || 0} accepted
              </p>
            )}
            {event.notes && <p className="text-muted-foreground">{event.notes}</p>}
          </div>

          {eventTeams.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">Teams involved</p>
              <div className="flex flex-wrap gap-1.5">
                {eventTeams.map((t) => (
                  <Badge key={t.id} variant="outline" className="text-xs">{t.name}</Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">
              Subtasks {task ? `(${task.progress || 0}% complete)` : ""}
            </p>
            <div className="border border-border rounded-lg divide-y divide-border">
              {subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-2.5 p-2.5 min-h-[44px]">
                  <Checkbox checked={s.status === "completed"} onCheckedChange={() => toggleSubtask(s)} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${s.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                      {s.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.due_date ? `due ${s.due_date}` : "No due date"}
                    </p>
                  </div>
                  <div className="w-40">
                    <SearchableSelect
                      value={s.assignee_id || ""}
                      onChange={(v) => assignSubtask(s, v)}
                      options={staff.map((person) => ({ value: person.user_id, label: person.user_name || person.user_email || "Unknown" }))}
                      placeholder="Assign to…"
                    />
                  </div>
                </div>
              ))}
              {subtasks.length === 0 && (
                <p className="p-3 text-xs text-muted-foreground">No subtasks yet.</p>
              )}
            </div>
          </div>

          {event.date && (
            <PromoteThisButton event={fromTryout(event)} clubId={effectiveClubId} variant="outline" className="w-full" />
          )}

          <Button
            variant="outline"
            onClick={handleDelete}
            className={`w-full gap-1.5 ${isMain ? "text-muted-foreground" : "text-destructive hover:text-destructive"}`}
            title={isMain ? "Create a replacement Main Club Tryout Date before deleting this one" : ""}
          >
            <Trash2 className="w-4 h-4" /> {isMain ? "Cannot delete without replacement" : "Delete Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}