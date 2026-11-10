import React from "react";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, User, ClipboardList, Users, Star } from "lucide-react";
import { EVENT_TYPE_META } from "@/lib/tryoutDefaults";

export default function TryoutEventCard({ event, task, onClick }) {
  const progress = task?.progress ?? 0;
  const subtaskCount = task ? 5 : 0;
  const doneCount = Math.round((progress / 100) * subtaskCount);
  const meta = EVENT_TYPE_META[event.type] || EVENT_TYPE_META.open_training;
  const isMain = event.type === "main_tryout";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-card rounded-lg p-3 space-y-2 hover:border-primary/50 transition-colors min-h-[44px] ${
        isMain ? "border-2 border-amber-400 shadow-md ring-1 ring-amber-200" : "border border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge className={`text-[10px] px-1.5 py-0 flex items-center gap-1 ${meta.badgeClass}`}>
          {isMain && <Star className="w-2.5 h-2.5 fill-current" />}
          {meta.short}
        </Badge>
        {event.registration_count > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="w-3 h-3" />
            {event.registration_count}{event.expected_attendance ? `/${event.expected_attendance}` : ""}
          </span>
        )}
      </div>

      <p className={`text-sm font-semibold text-foreground flex items-center gap-1.5 ${isMain ? "text-base" : ""}`}>
        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        {event.date}{event.start_time ? ` · ${event.start_time}` : ""}
      </p>

      {event.location && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
          <MapPin className="w-3 h-3 shrink-0" /> {event.location}
        </p>
      )}

      {event.responsible_name && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
          <User className="w-3 h-3 shrink-0" /> {event.responsible_name}
        </p>
      )}

      {isMain && (event.checked_in_count > 0 || event.evaluated_count > 0 || event.accepted_count > 0) && (
        <div className="flex flex-wrap gap-1.5 pt-0.5 text-[10px] text-muted-foreground">
          <span>✓ {event.checked_in_count || 0} checked-in</span>
          <span>· {event.evaluated_count || 0} evaluated</span>
          <span>· {event.accepted_count || 0} accepted</span>
        </div>
      )}

      {subtaskCount > 0 && (
        <div className="flex items-center gap-1.5 pt-0.5">
          <ClipboardList className="w-3 h-3 text-muted-foreground shrink-0" />
          <div className="flex-1 progress-track h-1.5">
            <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">{doneCount}/{subtaskCount}</span>
        </div>
      )}
    </button>
  );
}