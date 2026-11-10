import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WeekView from "@/components/calendar/WeekView";
import MonthView from "@/components/calendar/MonthView";
import EventDetailDialog from "@/components/calendar/EventDetailDialog";
import { Calendar, Clock, MapPin, Users, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { format, parseISO, isAfter, startOfDay, isSameDay } from "date-fns";

const TYPE_COLORS = {
  practice: "bg-emerald-100 text-emerald-700 border-emerald-200",
  game: "bg-blue-100 text-blue-700 border-blue-200",
  tournament: "bg-purple-100 text-purple-700 border-purple-200",
  meeting: "bg-amber-100 text-amber-700 border-amber-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function PlatformCalendar({ events, teams, players, guardians }) {
  const [view, setView] = useState("agenda");
  const [navDate, setNavDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Compute attendance for each event
  const eventsWithAttendance = useMemo(() => {
    return events.map(e => {
      const teamIds = e.team_ids || [];
      const teamPlayers = players.filter(p => teamIds.includes(p.team_id));
      const total = teamPlayers.length;
      const attending = teamPlayers.filter(p => e.rsvps?.[p.id] === "attending").length;
      const notAttending = teamPlayers.filter(p => e.rsvps?.[p.id] === "not_attending").length;
      const noResponse = total - attending - notAttending;
      return {
        ...e,
        _attendance: {
          attending,
          total,
          notAttending,
          noResponse,
          pct: total > 0 ? Math.round((attending / total) * 100) : 0,
        },
      };
    });
  }, [events, players]);

  const upcoming = useMemo(() => {
    const today = startOfDay(new Date());
    return eventsWithAttendance
      .filter(e => e.start_datetime && (isAfter(parseISO(e.start_datetime), today) || isSameDay(parseISO(e.start_datetime), today)))
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
  }, [eventsWithAttendance]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const e of upcoming) {
      const dateKey = format(parseISO(e.start_datetime), "yyyy-MM-dd");
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey).push(e);
    }
    return [...map.entries()].slice(0, 30);
  }, [upcoming]);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Platform Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="mb-3">
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>

          <TabsContent value="agenda">
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {grouped.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No upcoming events.</p>
              ) : grouped.map(([dateKey, dayEvents]) => (
                <div key={dateKey}>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1.5 sticky top-0 bg-card py-1">
                    {format(parseISO(dateKey + "T00:00:00"), "EEEE, MMM d")}
                  </p>
                  <div className="space-y-1.5">
                    {dayEvents.map((e) => (
                      <div key={e.id} onClick={() => setSelectedEvent(e)} className="flex items-start gap-3 p-2.5 rounded-lg border border-border/40 hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex flex-col items-center justify-center w-12 shrink-0 bg-primary/5 rounded-lg py-1">
                          <span className="text-[10px] font-bold uppercase text-primary">{format(parseISO(e.start_datetime), "MMM")}</span>
                          <span className="text-lg font-bold leading-none">{format(parseISO(e.start_datetime), "d")}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <Badge className={`text-[10px] capitalize border ${TYPE_COLORS[e.event_type] || TYPE_COLORS.other}`}>{e.event_type}</Badge>
                            <p className="text-sm font-medium truncate">{e.title}</p>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(parseISO(e.start_datetime), "h:mm a")}</span>
                            {e.location_text && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location_text}</span>}
                            {e.team_names?.length > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{e.team_names.join(", ")}</span>}
                          </div>
                          {e._attendance && e._attendance.total > 0 && (
                            <div className="flex items-center gap-2 mt-1 text-[10px]">
                              <span className="flex items-center gap-0.5 text-emerald-600"><CheckCircle2 className="w-2.5 h-2.5" />{e._attendance.attending}</span>
                              <span className="flex items-center gap-0.5 text-red-500"><XCircle className="w-2.5 h-2.5" />{e._attendance.notAttending}</span>
                              <span className="flex items-center gap-0.5 text-slate-400"><HelpCircle className="w-2.5 h-2.5" />{e._attendance.noResponse}</span>
                              <span className="text-muted-foreground">· {e._attendance.pct}% attending</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="week">
            <WeekView events={upcoming} onEventClick={setSelectedEvent} currentDate={navDate} onNavigate={setNavDate} />
          </TabsContent>

          <TabsContent value="month">
            <MonthView events={upcoming} onEventClick={setSelectedEvent} currentDate={navDate} onNavigate={setNavDate} />
          </TabsContent>
        </Tabs>
      </CardContent>

      <EventDetailDialog open={!!selectedEvent} onOpenChange={(v) => !v && setSelectedEvent(null)} event={selectedEvent} teams={teams} players={players} guardians={guardians} />
    </Card>
  );
}