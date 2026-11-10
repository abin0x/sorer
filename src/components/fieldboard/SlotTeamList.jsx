import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { compressLabels, kindOf } from "@/lib/gridEngine";
import { CalendarClock, CheckCircle2, Circle } from "lucide-react";
import GameScheduleDialog from "@/components/fieldboard/GameScheduleDialog";

export default function SlotTeamList({ slotBks, assignments, format, byBooking, selectedId, onSelect, onUnassignDrop, onClearBooking, onSplit, onReset, onRemoveLabel, onBookingUpdated }) {
  const [scheduleBooking, setScheduleBooking] = useState(null);

  const gameScheduleStatus = (b) => {
    const items = [
      !!b.referee_name,
      !!b.trainer_name,
      (b.volunteer_names || []).length > 0,
      !!b.video_setup,
    ];
    const done = items.filter(Boolean).length;
    return { done, total: 4 };
  };

  return (
    <div
      className="space-y-2"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        try { onUnassignDrop(JSON.parse(e.dataTransfer.getData("text/plain"))); } catch { /* not ours */ }
      }}
    >
      <div className="flex gap-2">
        <Button size="sm" onClick={onSplit}>Split equally</Button>
        <Button size="sm" variant="outline" onClick={onReset}>Reset</Button>
      </div>
      <p className="text-xs text-muted-foreground">Tap a team, then tap grids to assign multiple. Drag a chip back here to unassign.</p>
      {slotBks.map((b) => {
        const labels = assignments[b.id] || [];
        const issues = byBooking[b.id] || [];
        const training = kindOf(b) === "training";
        const isGame = b.type === "game" || b.event_type === "match";
        const status = isGame ? gameScheduleStatus(b) : null;
        return (
          <div
            key={b.id}
            draggable={training}
            onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify({ id: b.id, from: null }))}
            onClick={() => training && onSelect(selectedId === b.id ? null : b.id)}
            className={`rounded-lg border p-2 text-sm ${selectedId === b.id ? "border-primary bg-primary/10" : "bg-card"} ${training ? "cursor-pointer" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{b.team || (isGame ? `${b.team_name || "TBD"} vs ${b.away_team_name || "TBD"}` : b.event_type)}</span>
              {training && labels.length > 0 && <span className="text-xs font-bold text-primary">{compressLabels(labels, format)}</span>}
              {isGame && (
                <Badge variant={b.status === "confirmed" ? "default" : "outline"} className="text-xs">
                  {b.status === "confirmed" ? "Confirmed" : "Pending"}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{b.coach || "No coach"} · {b.event_type}</div>
            {training && (
              <div className="mt-1 flex flex-wrap gap-1">
                {labels.length === 0 && <span className="text-xs font-bold text-red-600">No grid</span>}
                {labels.map((l) => (
                  <span key={l} className="inline-flex items-center gap-0.5 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">
                    {l}
                    <button type="button" onClick={(e) => { e.stopPropagation(); onRemoveLabel(b.id, l); }} className="text-primary/60 hover:text-primary">×</button>
                  </span>
                ))}
              </div>
            )}
            {isGame && status && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: status.total }).map((_, i) => (
                    i < status.done
                      ? <CheckCircle2 key={i} className="h-3 w-3 text-green-500" />
                      : <Circle key={i} className="h-3 w-3 text-muted-foreground/40" />
                  ))}
                  <span className="ml-1 text-xs text-muted-foreground">{status.done}/{status.total} scheduled</span>
                </div>
                <Button size="sm" variant="ghost" className="h-6 px-1 text-xs" onClick={(e) => { e.stopPropagation(); setScheduleBooking(b); }}>
                  <CalendarClock className="mr-1 h-3 w-3" />Schedule
                </Button>
              </div>
            )}
            {issues.map((c) => (
              <div key={c.key} className={`text-xs ${c.severity === "error" ? "text-red-600" : "text-amber-600"}`}>{c.message}</div>
            ))}
            {training && labels.length > 0 && (
              <Button size="sm" variant="ghost" className="mt-1 h-6 px-1 text-xs" onClick={(e) => { e.stopPropagation(); onClearBooking(b.id); }}>Clear grids</Button>
            )}
          </div>
        );
      })}
      {scheduleBooking && (
        <GameScheduleDialog
          open={!!scheduleBooking}
          booking={scheduleBooking}
          onClose={() => setScheduleBooking(null)}
          onUpdated={() => { onBookingUpdated?.(); setScheduleBooking(null); }}
        />
      )}
    </div>
  );
}