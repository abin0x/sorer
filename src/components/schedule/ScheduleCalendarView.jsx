import React, { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClock, Pencil, Trash2, AlertTriangle } from "lucide-react";
import PropagationBadges from "./PropagationBadges";

const GROUP_KEYS = { branch: "_branch", gender: "_gender", field: "field_name", coach: "_coach", platform: "_platform" };

export default function ScheduleCalendarView({ events, groupBy, isConflict, onEdit, onDelete }) {
  const grouped = useMemo(() => {
    const key = GROUP_KEYS[groupBy] || "field_name";
    const map = new Map();
    for (const e of events) {
      const groupKey = e[key] || "Unassigned";
      if (!map.has(groupKey)) map.set(groupKey, []);
      map.get(groupKey).push(e);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [events, groupBy]);

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        <CalendarClock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        No bookings for this day.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {grouped.map(([groupName, groupEvents]) => (
        <div key={groupName}>
          <p className="text-xs font-bold uppercase tracking-wide text-[#399F7D] mb-2">{groupName}</p>
          <div className="border border-border rounded-xl divide-y divide-border/60 overflow-hidden">
            {groupEvents
              .slice()
              .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
              .map((e) => (
                <div key={e.id} className={`flex items-center gap-3 p-3 hover:bg-muted/20 ${isConflict(e.id) ? "bg-red-50" : ""}`}>
                  <div className="w-24 shrink-0 text-xs font-semibold text-foreground">
                    {format(parseISO(e.start_datetime), "h:mm a")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{e.team_names?.filter(Boolean).join(" vs ") || e.title}</p>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <Badge variant="outline" className="text-[9px]">{e.field_name}</Badge>
                      <Badge variant="outline" className="text-[9px]">{e._branch}</Badge>
                      <Badge variant="outline" className="text-[9px] capitalize">{e.event_type}</Badge>
                      <PropagationBadges calendarSynced={e.calendar_synced} notified={e.notified} />
                      {isConflict(e.id) && (
                        <Badge variant="outline" className="text-[9px] text-red-600 border-red-300">
                          <AlertTriangle className="w-2.5 h-2.5 mr-1" />Conflict
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(e)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => onDelete(e.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}