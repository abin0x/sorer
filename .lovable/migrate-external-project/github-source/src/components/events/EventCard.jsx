import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, MapPin, Clock, Pencil, Trash2, UsersRound, Tent, GraduationCap, Stethoscope, Trophy, CircleDot, PartyPopper, Megaphone } from "lucide-react";
import { format, parseISO } from "date-fns";
import PromoteThisButton from "@/components/marketing/PromoteThisButton";
import { fromClubEvent } from "@/lib/marketing/events";
import { useTenant } from "@/lib/TenantContext";

const TYPE_ICON = { camp: Tent, class: GraduationCap, clinic: Stethoscope, tournament: Trophy, open_play: CircleDot, social: PartyPopper };
const TYPE_GRADIENT = {
  camp: "from-emerald-400/20 to-teal-500/10",
  class: "from-indigo-400/20 to-blue-500/10",
  clinic: "from-rose-400/20 to-pink-500/10",
  tournament: "from-amber-400/20 to-orange-500/10",
  open_play: "from-sky-400/20 to-cyan-500/10",
  social: "from-fuchsia-400/20 to-purple-500/10",
};
const STATUS_COLOR = {
  draft: "bg-slate-100 text-slate-600",
  open: "bg-emerald-100 text-emerald-700",
  full: "bg-amber-100 text-amber-700",
  closed: "bg-rose-100 text-rose-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export default function EventCard({ event, onEdit, onDelete, onRoster, onSchedule, onPromote }) {
  const { effectiveClubId } = useTenant();
  const dateLabel = event.start_date
    ? format(parseISO(event.start_date), "MMM d, yyyy")
    : "—";
  const dateRange = event.end_date && event.end_date !== event.start_date
    ? `${dateLabel} → ${format(parseISO(event.end_date), "MMM d")}`
    : dateLabel;
  const spots = event.capacity > 0 ? `${event.registered_count || 0}/${event.capacity}` : `${event.registered_count || 0} spots`;
  const isFull = event.capacity > 0 && (event.registered_count || 0) >= event.capacity;
  const TypeIcon = TYPE_ICON[event.type] || Calendar;

  return (
    <Card className="adisal-card overflow-hidden group relative">
      {/* Gradient header strip */}
      <div className={`h-20 bg-gradient-to-br ${TYPE_GRADIENT[event.type] || TYPE_GRADIENT.camp} flex items-center justify-between px-5`}>
        <TypeIcon className="w-7 h-7 text-foreground/70" strokeWidth={1.75} />
        <Badge className={`text-[10px] uppercase tracking-wide font-semibold ${STATUS_COLOR[event.status] || ""}`}>
          {event.status}
        </Badge>
      </div>

      <CardContent className="p-5 space-y-3">
        <div>
          <h3 className="font-bold text-base leading-tight truncate">{event.name}</h3>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">{event.type?.replace("_", " ")}{event.schedule_type === "recurring" ? " · Recurring" : event.schedule_type === "multi_date" ? " · Multi-day" : ""}</p>
        </div>

        {event.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{event.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{dateRange}</span>
          {event.start_time && (
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{event.start_time}{event.end_time ? `–${event.end_time}` : ""}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {event.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.location}</span>}
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{spots}</span>
        </div>

        {(event.waitlist_count || 0) > 0 && (
          <p className="text-xs text-amber-600 font-medium">{event.waitlist_count} on waitlist</p>
        )}

        {event.scheduling_event_id && onSchedule && <Button variant="outline" size="sm" className="w-full" onClick={() => onSchedule(event)}><Calendar className="w-3.5 h-3.5" /> View dates, groups & sessions</Button>}

        {event.start_date && (
          <PromoteThisButton event={fromClubEvent(event)} clubId={effectiveClubId} size="sm" variant="outline" className="w-full" />
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm font-bold">{event.price > 0 ? `$${event.price}` : <span className="text-emerald-600">Free</span>}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => onRoster(event)} className="h-8">
              <UsersRound className="w-3.5 h-3.5 mr-1" /> Roster
            </Button>
            {onPromote && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Create social post" onClick={() => onPromote(event)}>
                <Megaphone className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onEdit(event)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700" onClick={() => onDelete(event)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}