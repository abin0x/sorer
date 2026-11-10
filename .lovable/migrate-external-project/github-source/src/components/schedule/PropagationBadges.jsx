import React from "react";
import { CalendarCheck, BellRing } from "lucide-react";

export default function PropagationBadges({ calendarSynced, notified }) {
  return (
    <div className="flex items-center gap-1">
      <span
        title={calendarSynced ? "Synced to team calendar" : "Not yet synced to calendar"}
        className={`inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded ${calendarSynced ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground/60"}`}
      >
        <CalendarCheck className="w-2.5 h-2.5" />
      </span>
      <span
        title={notified ? "Players, coaches & parents notified" : "Not yet notified"}
        className={`inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded ${notified ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground/60"}`}
      >
        <BellRing className="w-2.5 h-2.5" />
      </span>
    </div>
  );
}