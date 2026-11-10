import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin, Clock, Users } from "lucide-react";
import { format, parseISO, startOfWeek, addDays, isSameDay, startOfDay } from "date-fns";

const TYPE_COLORS = {
  practice: "bg-emerald-100 text-emerald-700 border-emerald-200",
  game: "bg-blue-100 text-blue-700 border-blue-200",
  tournament: "bg-purple-100 text-purple-700 border-purple-200",
  meeting: "bg-amber-100 text-amber-700 border-amber-200",
  camp: "bg-cyan-100 text-cyan-700 border-cyan-200",
  clinic: "bg-pink-100 text-pink-700 border-pink-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM – 8 PM

export default function WeekView({ events, onEventClick, currentDate, onNavigate }) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = startOfDay(new Date());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" onClick={() => onNavigate(addDays(weekStart, -7))}>
          <ChevronLeft className="w-4 h-4" /> Prev Week
        </Button>
        <p className="text-sm font-bold text-foreground">{format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}</p>
        <Button size="sm" variant="outline" onClick={() => onNavigate(addDays(weekStart, 7))}>
          Next Week <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="border border-border rounded-xl overflow-x-auto">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[700px]">
          {/* Header row */}
          <div className="border-b border-r border-border bg-muted/30" />
          {days.map((d) => {
            const isToday = isSameDay(d, today);
            return (
              <div key={d.toISOString()} className={`border-b border-r border-border p-2 text-center ${isToday ? "bg-primary/10" : "bg-muted/30"}`}>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">{format(d, "EEE")}</p>
                <p className={`text-sm font-bold ${isToday ? "text-primary" : "text-foreground"}`}>{format(d, "d")}</p>
              </div>
            );
          })}

          {/* Time rows */}
          {HOURS.map((h) => (
            <React.Fragment key={h}>
              <div className="border-b border-r border-border p-1 text-[10px] text-muted-foreground text-right pr-2">
                {h > 12 ? `${h - 12}` : h}{h >= 12 ? "p" : "a"}
              </div>
              {days.map((d) => {
                const dayEvents = events.filter((e) => {
                  if (!e.start_datetime) return false;
                  const evDate = parseISO(e.start_datetime);
                  if (!isSameDay(evDate, d)) return false;
                  return evDate.getHours() >= h && evDate.getHours() < h + 1;
                });
                return (
                  <div key={`${d.toISOString()}-${h}`} className="border-b border-r border-border min-h-[48px] p-1 space-y-1 hover:bg-muted/20 transition-colors">
                    {dayEvents.map((e) => (
                      <button key={e.id} onClick={() => onEventClick(e)} className={`w-full text-left text-[10px] rounded px-1.5 py-1 border ${TYPE_COLORS[e.event_type] || TYPE_COLORS.other} hover:shadow-sm transition-shadow`}>
                        <p className="font-semibold truncate">{e.title}</p>
                        <p className="flex items-center gap-0.5 text-muted-foreground">
                          <Clock className="w-2.5 h-2.5" />{format(parseISO(e.start_datetime), "h:mm a")}
                        </p>
                        {e._attendance && (
                          <p className="flex items-center gap-0.5 text-muted-foreground">
                            <Users className="w-2.5 h-2.5" />{e._attendance.attending}/{e._attendance.total}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}