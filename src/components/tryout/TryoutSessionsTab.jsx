import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CalendarPlus, Copy, Layers, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import EventDialog from "@/components/tryout/EventDialog";
import BatchSessionDialog from "@/components/tryout/BatchSessionDialog";
import { scanSessionConflicts } from "@/lib/tryoutDay";
import { deleteSession, shiftDate } from "@/lib/tryoutSessions";
import { EVENT_TYPE_META } from "@/lib/tryoutDefaults";

/**
 * Admin setup view of a tryout event's sessions: the whole schedule in one
 * table, with bulk creation, duplication and the field/coach/capacity
 * conflicts across the run.
 */
export default function TryoutSessionsTab({ plan, events = [], staff = [], canManage, onChanged }) {
  const [dialog, setDialog] = useState(null);
  const [showBatch, setShowBatch] = useState(false);
  const [working, setWorking] = useState(false);

  const sessions = [...events].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const conflicts = scanSessionConflicts(sessions, plan);
  const conflictsBySession = conflicts.reduce((acc, c) => {
    acc[c.sessionId] = [...(acc[c.sessionId] || []), c.message];
    return acc;
  }, {});

  const handleDelete = async (session) => {
    if (session.is_anchor) {
      toast.error("The Main Club Tryout Date can't be deleted without a replacement. Create a new one first, then delete this.");
      return;
    }
    if (!window.confirm(`Delete the ${session.date} session? This also removes its task and notifies registered families.`)) return;
    setWorking(true);
    await deleteSession(session);
    setWorking(false);
    toast.success("Session deleted");
    onChanged();
  };

  const closeDialog = () => setDialog(null);

  if (!sessions.length) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12 border border-dashed border-border rounded-xl text-sm text-muted-foreground">
          No sessions yet. Add one, or build the whole schedule in one go.
        </div>
        {canManage && (
          <div className="flex justify-center gap-2">
            <Button onClick={() => setDialog({})} className="gap-1.5"><Plus className="w-4 h-4" /> Add session</Button>
            <Button variant="outline" onClick={() => setShowBatch(true)} className="gap-1.5"><Layers className="w-4 h-4" /> Bulk add sessions</Button>
          </div>
        )}
        {dialog && (
          <EventDialog open plan={plan} staff={staff} events={events} initial={dialog.initial} forceType={dialog.forceType} onClose={closeDialog} onCreated={() => { closeDialog(); onChanged(); }} />
        )}
        <BatchSessionDialog open={showBatch} plan={plan} events={events} staff={staff} onClose={() => setShowBatch(false)} onCreated={() => { setShowBatch(false); onChanged(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><CalendarPlus className="w-4 h-4" /> {sessions.length} session{sessions.length === 1 ? "" : "s"}</span>
          <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {new Set(sessions.flatMap((s) => s.evaluator_ids || [])).size} evaluators</span>
          <span className={plan?.max_capacity ? "" : "hidden"}>Cap {plan?.max_capacity} players</span>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button onClick={() => setDialog({})} className="gap-1.5"><Plus className="w-4 h-4" /> Add session</Button>
            <Button variant="outline" onClick={() => setShowBatch(true)} className="gap-1.5"><Layers className="w-4 h-4" /> Bulk add sessions</Button>
          </div>
        )}
      </div>

      {conflicts.length > 0 && (
        <div className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Schedule conflicts</p>
          {conflicts.map((c, i) => (
            <p key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {c.message}
            </p>
          ))}
        </div>
      )}

      <div className="border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Evaluators</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => {
              const meta = EVENT_TYPE_META[s.type] || EVENT_TYPE_META.open_training;
              const registered = s.registration_count || 0;
              const over = s.capacity && registered > s.capacity;
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium whitespace-nowrap">{s.date}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {s.start_time ? `${s.start_time}${s.end_time ? `–${s.end_time}` : ""}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${meta.badgeClass}`}>{meta.short}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{s.field_name || s.location || "—"}</TableCell>
                  <TableCell className="text-sm">
                    <span className={over ? "text-destructive font-medium" : ""}>
                      {registered}{s.capacity ? ` / ${s.capacity}` : ""}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(s.evaluator_names || []).length ? s.evaluator_names.join(", ") : "—"}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => setDialog({ editEvent: s })} aria-label="Edit session"><Pencil className="w-4 h-4" /></Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={s.type === "main_tryout"}
                        aria-label="Duplicate session a week later"
                        title={s.type === "main_tryout" ? "The Main Club Tryout Date can't be duplicated" : "Duplicate a week later"}
                        onClick={() => {
                          if (s.type === "main_tryout") {
                            toast.error("The Main Club Tryout Date can't be duplicated — add an open training or supplemental session instead.");
                            return;
                          }
                          setDialog({ initial: { ...s, date: shiftDate(s.date, 7) } });
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s)} disabled={working} aria-label="Delete session"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {conflictsBySession && Object.keys(conflictsBySession).length > 0 && (
        <p className="text-xs text-muted-foreground">
          Sessions with conflicts: {sessions.filter((s) => conflictsBySession[s.id]).map((s) => s.date).join(", ")}
        </p>
      )}

      {dialog && (
        <EventDialog
          open
          plan={plan}
          staff={staff}
          events={events}
          editEvent={dialog.editEvent}
          initial={dialog.initial}
          forceType={dialog.forceType}
          onClose={closeDialog}
          onCreated={() => { closeDialog(); onChanged(); }}
        />
      )}
      <BatchSessionDialog open={showBatch} plan={plan} events={events} staff={staff} onClose={() => setShowBatch(false)} onCreated={() => { setShowBatch(false); onChanged(); }} />
    </div>
  );
}