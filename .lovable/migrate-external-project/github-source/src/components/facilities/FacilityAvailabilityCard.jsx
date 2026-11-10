import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Grid3x3, Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { format, parseISO, isAfter, isSameDay, startOfDay } from "date-fns";
import { createPageUrl } from "@/utils";

export default function FacilityAvailabilityCard({ facility, events = [], programs = [] }) {
  const today = startOfDay(new Date());
  const facilityEvents = events.filter((e) => e.facility_id === facility.id && e.start_datetime);
  const facilityPrograms = programs.filter((p) => p.facility_id === facility.id);

  const upcomingEvents = facilityEvents
    .filter((e) => {
      const d = parseISO(e.start_datetime);
      return isAfter(d, today) || isSameDay(d, today);
    })
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

  const nextEvent = upcomingEvents[0];
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thisWeekCount = facilityEvents.filter((e) => {
    const d = parseISO(e.start_datetime);
    return (isAfter(d, today) || isSameDay(d, today)) && d <= weekFromNow;
  }).length;

  const capacity = facility.capacity || 1;
  const utilizationPct = Math.min(100, Math.round((thisWeekCount / capacity) * 100));
  const isHighUtil = utilizationPct >= 80;

  const availableDays = facility.available_days?.length || 7;
  const todayKey = format(today, "EEE").toLowerCase().slice(0, 3);
  const openToday = facility.available_days?.includes(todayKey) ?? true;

  return (
    <Card className="border-border rounded-xl hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={createPageUrl("Facilities")} className="font-bold text-sm text-foreground hover:text-primary truncate block">
              {facility.name}
            </Link>
            {facility.location_name && <p className="text-xs text-muted-foreground truncate">{facility.location_name}</p>}
          </div>
          <Badge className={`text-[10px] ${openToday ? "bg-primary/15 text-primary" : "bg-amber-100 text-amber-700"}`}>
            {openToday ? "Available" : "Closed"}
          </Badge>
        </div>

        {facility.address && (
          <p className="text-xs text-muted-foreground flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0" />{facility.address}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] capitalize">{facility.surface_type || "grass"}</Badge>
          <Badge variant="outline" className="text-[10px]"><Grid3x3 className="w-3 h-3 mr-1" />{facility.field_count || 1}</Badge>
        </div>

        {/* Utilization bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">This Week</span>
            <span className={`text-[10px] font-bold ${isHighUtil ? "text-amber-600" : "text-primary"}`}>{utilizationPct}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${isHighUtil ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${utilizationPct}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="text-center bg-muted/40 rounded-lg py-1.5">
            <p className="text-sm font-bold text-foreground">{facilityPrograms.length}</p>
            <p className="text-[9px] uppercase text-muted-foreground">Programs</p>
          </div>
          <div className="text-center bg-muted/40 rounded-lg py-1.5">
            <p className="text-sm font-bold text-foreground">{thisWeekCount}</p>
            <p className="text-[9px] uppercase text-muted-foreground">Events (7d)</p>
          </div>
        </div>

        {nextEvent ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border">
            <Calendar className="w-3 h-3 shrink-0 text-primary" />
            <span className="truncate">Next: {nextEvent.title}</span>
            <span className="ml-auto shrink-0 font-medium">{format(parseISO(nextEvent.start_datetime), "MMM d")}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60 pt-1 border-t border-border">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>No upcoming bookings</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}