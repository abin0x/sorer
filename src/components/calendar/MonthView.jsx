import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, startOfDay } from "date-fns";

const TYPE_DOTS = {
  practice: "bg-emerald-500",
  game: "bg-blue-500",
  tournament: "bg-purple-500",
  meeting: "bg-amber-500",
  camp: "bg-cyan-500",
  clinic: "bg-pink-500",
  other: "bg-slate-500",
};

export default function MonthView({ events, onEventClick, currentDate, onNavigate }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const today = startOfDay(new Date());

  const days = [];
  let d = gridStart;
  while (d <= gridEnd) { days.push(d); d = addDays(d, 1); }

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" onClick={() => onNavigate(addDays(monthStart, -1))}>
          <ChevronLeft className="w-4 h-4" /> Prev Month
        </Button>
        <p className="text-sm font-bold text-foreground">{format(currentDate, "MMMM yyyy")}</p>
        <Button size="sm" variant="outline" onClick={() => onNavigate(addDays(monthStart, 31))}>
          Next Month <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-7">
          {dayNames.map((n) => (
            <div key={n} className="border-b border-r border-border bg-muted/30 p-2 text-center text-[10px] uppercase font-semibold text-muted-foreground last:border-r-0">{n}</div>
          ))}
          {days.map((day) => {
            const inMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, today);
            const dayEvents = events.filter((e) => {
              if (!e.start_datetime) return false;
              return isSameDay(parseISO(e.start_datetime), day);
            }).sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

            return (
              <div key={day.toISOString()} className={`border-b border-r border-border min-h-[90px] p-1.5 last:border-r-0 ${inMonth ? "bg-white" : "bg-muted/20"} ${isToday ? "ring-2 ring-inset ring-primary/40" : ""}`}>
                <p className={`text-[11px] font-bold mb-1 ${isToday ? "text-primary" : inMonth ? "text-foreground" : "text-muted-foreground/40"}`}>
                  {format(day, "d")}
                </p>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <button key={e.id} onClick={() => onEventClick(e)} className="w-full text-left flex items-center gap-1 text-[10px] rounded px-1 py-0.5 hover:bg-muted/50 transition-colors min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DOTS[e.event_type] || TYPE_DOTS.other}`} />
                      <span className="text-muted-foreground shrink-0">{format(parseISO(e.start_datetime), "h:mm a")}</span>
                      <span className="font-medium text-foreground truncate">{e.title}</span>
                      {e._attendance && <span className="text-muted-foreground/60 shrink-0">{e._attendance.attending}/{e._attendance.total}</span>}
                    </button>
                  ))}
                  {dayEvents.length > 3 && <p className="text-[9px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}