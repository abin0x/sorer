import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Bell, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { format, parseISO, isAfter, startOfDay, isSameDay } from "date-fns";
import { toast } from "sonner";
import EventDetailDialog from "@/components/calendar/EventDetailDialog";
import { computeTeamAttendance } from "@/components/platform/attendanceUtils";

const TYPE_COLORS = {
  practice: "bg-emerald-100 text-emerald-700 border-emerald-200",
  game: "bg-blue-100 text-blue-700 border-blue-200",
  tournament: "bg-purple-100 text-purple-700 border-purple-200",
  meeting: "bg-amber-100 text-amber-700 border-amber-200",
  camp: "bg-cyan-100 text-cyan-700 border-cyan-200",
  clinic: "bg-pink-100 text-pink-700 border-pink-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function TeamSchedulePanel({ teamId, team }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [sendingId, setSendingId] = useState(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["team-schedule-events", teamId],
    queryFn: () => base44.entities.CalendarEvent.list("start_datetime", 500),
  });
  const { data: allTeams = [] } = useQuery({ queryKey: ["team-schedule-teams"], queryFn: () => base44.entities.Team.list("name", 200) });
  const { data: players = [] } = useQuery({ queryKey: ["team-schedule-players"], queryFn: () => base44.entities.Player.list("-created_date", 300) });
  const { data: guardians = [] } = useQuery({ queryKey: ["team-schedule-guardians"], queryFn: () => base44.entities.Guardian.list("-created_date", 300) });

  const myTeam = allTeams.find((t) => t.id === teamId) || team;
  const myTeams = myTeam ? [myTeam] : [];

  const upcoming = useMemo(() => {
    const today = startOfDay(new Date());
    return events
      .filter((e) => e.start_datetime && (isAfter(parseISO(e.start_datetime), today) || isSameDay(parseISO(e.start_datetime), today)))
      .filter((e) => (e.team_ids || []).includes(teamId))
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 8);
  }, [events, teamId]);

  const allTeamEvents = useMemo(() => events.filter((e) => (e.team_ids || []).includes(teamId)), [events, teamId]);
  const teamAttendance = useMemo(() => computeTeamAttendance(myTeam || {}, players, allTeamEvents), [myTeam, players, allTeamEvents]);

  const getAttendance = (event) => {
    const playerIds = myTeam?.player_ids || [];
    const rsvps = event.rsvps || {};
    let attending = 0, notAttending = 0, noResponse = 0;
    for (const pid of playerIds) {
      if (rsvps[pid] === "attending") attending++;
      else if (rsvps[pid] === "not_attending") notAttending++;
      else noResponse++;
    }
    return { attending, notAttending, noResponse, total: playerIds.length };
  };

  const handleReminder = async (e, eventId) => {
    e.stopPropagation();
    setSendingId(eventId);
    try {
      const res = await base44.functions.invoke("sendRsvpReminder", { event_id: eventId });
      toast.success(`Reminder sent to ${res.data.sent} non-responder${res.data.sent !== 1 ? "s" : ""}`);
    } catch (err) {
      toast.error("Failed to send reminders");
    }
    setSendingId(null);
  };

  return (
    <Card className="adisal-card lg:col-span-3">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> Team Schedule & Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        {allTeamEvents.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="surface-tile p-3 rounded-lg text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Training</p>
              <p className="text-xl font-bold text-primary">{teamAttendance.trainingPct}%</p>
              <div className="h-1 bg-muted rounded-full mt-1.5 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${teamAttendance.trainingPct}%` }} /></div>
            </div>
            <div className="surface-tile p-3 rounded-lg text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Games</p>
              <p className="text-xl font-bold text-primary">{teamAttendance.gamePct}%</p>
              <div className="h-1 bg-muted rounded-full mt-1.5 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${teamAttendance.gamePct}%` }} /></div>
            </div>
            <div className="surface-tile p-3 rounded-lg text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Overall</p>
              <p className="text-xl font-bold text-primary">{teamAttendance.overallPct}%</p>
              <div className="h-1 bg-muted rounded-full mt-1.5 overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${teamAttendance.overallPct}%` }} /></div>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No upcoming events for this team.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((e) => {
              const att = getAttendance(e);
              return (
                <div key={e.id} onClick={() => setSelectedEvent(e)} className="flex items-start gap-3 p-3 rounded-xl border border-border/40 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex flex-col items-center justify-center w-14 shrink-0 bg-primary/5 rounded-lg py-1.5">
                    <span className="text-[10px] font-bold uppercase text-primary">{format(parseISO(e.start_datetime), "MMM")}</span>
                    <span className="text-xl font-bold leading-none">{format(parseISO(e.start_datetime), "d")}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <Badge className={`text-[10px] capitalize border ${TYPE_COLORS[e.event_type] || TYPE_COLORS.other}`}>{e.event_type}</Badge>
                      <p className="font-medium text-sm truncate">{e.title}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(parseISO(e.start_datetime), "h:mm a")}</span>
                      {e.location_text && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location_text}</span>}
                    </div>
                    {att.total > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex h-1.5 flex-1 rounded-full overflow-hidden bg-slate-100">
                          <div className="bg-emerald-500" style={{ width: `${(att.attending / att.total) * 100}%` }} />
                          <div className="bg-red-400" style={{ width: `${(att.notAttending / att.total) * 100}%` }} />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] shrink-0">
                          <span className="flex items-center gap-0.5 text-emerald-600"><CheckCircle2 className="w-2.5 h-2.5" />{att.attending}</span>
                          <span className="flex items-center gap-0.5 text-red-500"><XCircle className="w-2.5 h-2.5" />{att.notAttending}</span>
                          <span className="flex items-center gap-0.5 text-slate-400"><HelpCircle className="w-2.5 h-2.5" />{att.noResponse}</span>
                        </div>
                        {att.noResponse > 0 && (
                          <Button size="sm" variant="ghost" disabled={sendingId === e.id} onClick={(ev) => handleReminder(ev, e.id)} className="h-6 px-2 text-[10px] text-amber-600 hover:bg-amber-50">
                            <Bell className="w-2.5 h-2.5 mr-0.5" />{sendingId === e.id ? "…" : "Remind"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <EventDetailDialog open={!!selectedEvent} onOpenChange={(v) => !v && setSelectedEvent(null)} event={selectedEvent} teams={myTeams} players={players} guardians={guardians} />
    </Card>
  );
}