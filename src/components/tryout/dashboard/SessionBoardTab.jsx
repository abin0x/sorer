import React, { useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, GripVertical, Layers } from "lucide-react";
import { PaymentBadge, WaiverBadge } from "@/components/tryout/dashboard/StatusChips";
import { movePlayers, playerAge, sessionOptionLabel } from "@/lib/tryoutDashboard";

const Card = ({ reg }) => (
  <div className="bg-card border border-border rounded-lg p-2.5 shadow-sm">
    <div className="flex items-start gap-1.5">
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">
          {Number(reg.bib_number) >= 1 && <span className="font-mono text-muted-foreground mr-1">#{reg.bib_number}</span>}
          {reg.player_name}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">
          {playerAge(reg) !== null ? `${playerAge(reg)} yrs · ` : ""}{reg.desired_age_group || reg.player_gender || "—"}
        </p>
        <div className="flex flex-wrap gap-1 pt-1">
          {reg.status === "waitlist" && <Badge className="bg-amber-100 text-amber-700">Waitlist</Badge>}
          <PaymentBadge status={reg.payment_status} />
          <WaiverBadge status={reg.waiver_status} />
        </div>
      </div>
    </div>
  </div>
);

/** Sessions as columns — drag a player (or a pool entry) into the session they
 *  belong in. Capacity and waitlists are recalculated by the server. */
export default function SessionBoardTab({ plans, events, registrations, onChanged }) {
  const firstWithSessions = plans.find((p) => events.some((e) => e.tryout_plan_id === p.id));
  const [planId, setPlanId] = useState(firstWithSessions?.id || plans[0]?.id || "");
  const [busy, setBusy] = useState(false);

  const plan = plans.find((p) => p.id === planId);
  const sessions = useMemo(
    () => events.filter((e) => e.tryout_plan_id === planId).sort((a, b) => String(a.date).localeCompare(String(b.date))),
    [events, planId],
  );
  const inPlan = registrations.filter((r) => r.tryout_plan_id === planId);
  const pool = registrations.filter((r) => (!r.tryout_plan_id || r.status === "pooled")
    && (!plan?.season || !r.season_name || r.season_name === plan.season));

  const bySession = (id) => inPlan.filter((r) => r.tryout_event_id === id)
    .sort((a, b) => String(a.player_name).localeCompare(String(b.player_name)));

  const onDragEnd = async (result) => {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    if (destination.droppableId === "pool") {
      toast.info("Players are moved between sessions — to remove one, cancel the spot from their registration.");
      return;
    }
    setBusy(true);
    try {
      const res = await movePlayers([draggableId], destination.droppableId);
      toast.success(res.waitlisted ? "Session was full — the player went on the waitlist" : `${res.moved} player moved`);
      onChanged();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!plans.length) {
    return <p className="text-sm text-muted-foreground text-center py-16 border border-dashed border-border rounded-xl">No tryouts yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={planId} onValueChange={setPlanId}>
          <SelectTrigger className="w-full sm:w-80"><SelectValue placeholder="Pick a tryout" /></SelectTrigger>
          <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Drag a player into another session to move them. Bib numbers and payments travel with the player.</p>
        {busy && <span className="text-xs text-muted-foreground">Saving…</span>}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid gap-3 lg:grid-cols-4">
          <Droppable droppableId="pool">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="bg-muted/40 rounded-xl p-2.5 min-h-[220px] space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5 px-1">
                  <Layers className="w-3.5 h-3.5" /> Pool <span className="text-muted-foreground/70">({pool.length})</span>
                </p>
                {pool.slice(0, 60).map((r, index) => (
                  <Draggable draggableId={r.id} index={index} key={r.id}>
                    {(dp) => <div ref={dp.innerRef} {...dp.draggableProps} {...dp.dragHandleProps}><Card reg={r} /></div>}
                  </Draggable>
                ))}
                {pool.length === 0 && <p className="text-[11px] text-muted-foreground px-1">Everyone in the pool has a session.</p>}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {sessions.map((e) => {
            const rows = bySession(e.id);
            const taken = rows.filter((r) => r.status !== "waitlist").length;
            const over = e.capacity ? taken > e.capacity : false;
            return (
              <Droppable droppableId={e.id} key={e.id}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={`bg-muted/40 rounded-xl p-2.5 min-h-[220px] space-y-2 ${over ? "ring-1 ring-rose-300" : ""}`}>
                    <div className="px-1">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">{sessionOptionLabel(e)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {taken}{e.capacity ? ` / ${e.capacity}` : ""} booked{e.field_name ? ` · ${e.field_name}` : ""}
                        {rows.filter((r) => r.status === "waitlist").length ? ` · ${rows.filter((r) => r.status === "waitlist").length} waitlist` : ""}
                      </p>
                      {over && (
                        <p className="text-[11px] text-rose-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Over capacity
                        </p>
                      )}
                    </div>
                    {rows.map((r, index) => (
                      <Draggable draggableId={r.id} index={index} key={r.id}>
                        {(dp) => <div ref={dp.innerRef} {...dp.draggableProps} {...dp.dragHandleProps}><Card reg={r} /></div>}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}