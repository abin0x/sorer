import React from "react";
import { addDays, format, isSameMonth, isToday, parseISO } from "date-fns";
import { PLATFORMS } from "@/lib/marketing/constants";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarMonth({ month, gridStart, posts, events, onPostClick, onMovePost }) {
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weeks = days.slice(35).some((d) => isSameMonth(d, month)) ? 6 : 5;
  return (
    <div className="rounded-xl border overflow-hidden bg-card">
      <div className="grid grid-cols-7 bg-muted/50 text-[11px] font-semibold text-muted-foreground">
        {DAYS.map((d) => <div key={d} className="p-2 text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.slice(0, weeks * 7).map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayPosts = posts.filter((p) => p.scheduled_for && format(parseISO(p.scheduled_for), "yyyy-MM-dd") === key);
          const dayEvents = events.filter((e) => e.date === key);
          return (
            <div
              key={key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); const p = posts.find((x) => x.id === id); if (p) onMovePost(p, day); }}
              className={`min-h-[72px] sm:min-h-[104px] border-t border-l p-1 space-y-0.5 ${isSameMonth(day, month) ? "" : "bg-muted/30 text-muted-foreground"}`}
            >
              <div className={`text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full ${isToday(day) ? "bg-primary text-primary-foreground" : ""}`}>{format(day, "d")}</div>
              {dayEvents.slice(0, 2).map((e) => (
                <div key={e.key} title={e.title} className="text-[10px] leading-tight px-1 rounded bg-amber-100 text-amber-800 truncate"><span className="hidden sm:inline">◆ </span>{e.title}</div>
              ))}
              <div className="flex flex-wrap gap-0.5 sm:block sm:space-y-0.5">
                {dayPosts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    draggable={p.status !== "published"}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
                    onClick={() => onPostClick(p)}
                    title={p.title}
                    className={`sm:w-full text-left rounded border text-[10px] px-1 py-0.5 flex items-center gap-1 ${PLATFORMS[p.platform]?.chip} ${p.status === "draft" ? "border-dashed" : ""}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PLATFORMS[p.platform]?.dot}`} />
                    <span className="hidden sm:inline truncate">{p.title}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}