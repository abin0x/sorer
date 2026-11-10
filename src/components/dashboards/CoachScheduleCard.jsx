import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MultiSelectFilter from "@/components/calendar/MultiSelectFilter";
import WeekView from "@/components/calendar/WeekView";
import EventDetailDialog from "@/components/calendar/EventDetailDialog";
import TeamEventDialog from "@/components/calendar/TeamEventDialog";
import { Calendar, Clock, MapPin, Users, CheckCircle2, XCircle, HelpCircle, Bell, List, Grid } from "lucide-react";
import { format, parseISO, isAfter, startOfDay, isSameDay } from "date-fns";
import { toast } from "sonner";

const TYPE_COLORS = {
  practice: "bg-emerald-100 text-emerald-700 border-emerald-200",
  game: "bg-blue-100 text-blue-700 border-blue-200",
  tournament: "bg-purple-100 text-purple-700 border-purple-200",
  meeting: "bg-amber-100 text-amber-700 border-amber-200",
  camp: "bg-cyan-100 text-cyan-700 border-cyan-200",
  clinic: "bg-pink-100 text-pink-700 border-pink-200",
  other: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

function getAttendance(event, myTeams) {
  const teamIds = event.team_ids || [];
  const playerIds = [...new Set(myTeams.filter((t) => teamIds.includes(t.id)).flatMap((t) => t.player_ids || []))];
  const rsvps = event.rsvps || {};
  let attending = 0, notAttending = 0, noResponse = 0;
  for (const pid of playerIds) {
    if (rsvps[pid] === "attending") attending++;
    else if (rsvps[pid] === "not_attending") notAttending++;
    else noResponse++;
  }
  return { attending, notAttending, noResponse, total: playerIds.length };
}

export default function CoachScheduleCard({ myTeams, canManage = false }) {
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [view, setView] = useState("list");
  const [navDate, setNavDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["calendar-events"],
    queryFn: () => base44.entities.CalendarEvent.list("start_datetime", 500),
  });
  const { data: players = [] } = useQuery({ queryKey: ["coach-schedule-players"], queryFn: () => base44.entities.Player.list("-created_date", 300) });
  const { data: guardians = [] } = useQuery({ queryKey: ["coach-schedule-guardians"], queryFn: () => base44.entities.Guardian.list("-created_date", 300) });

  const myTeamIds = useMemo(() => new Set(myTeams.map((t) => t.id)), [myTeams]);
  const activeTeamFilter = selectedTeams.length > 0 ? new Set(selectedTeams) : myTeamIds;

  const filteredEvents = useMemo(() => {
    const today = startOfDay(new Date());
    return events
      .filter((e) => e.start_datetime && (isAfter(parseISO(e.start_datetime), today) || isSameDay(parseISO(e.start_datetime), today)))
      .filter((e) => (e.team_ids || []).some((id) => myTeamIds.has(id)))
      .filter((e) => (e.team_ids || []).some((id) => activeTeamFilter.has(id)))
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
  }, [events, myTeamIds, activeTeamFilter]);

  const handleReminder = async (e, eventId) => {
    e.stopPropagation();
    setSendingId(eventId);
    try {
      const res = await base44.functions.invoke("sendRsvpReminder", { event_id: eventId });
      toast.success(`Reminder sent to ${res.data.sent} non-responder${res.data.sent !== 1 ? "s" : ""}`);
    } catch (err) { toast.error("Failed to send reminders"); }
    setSendingId(null);
  };

  return (
    <Card className="soft-shadow border-border-subtle animate-fadeInUp">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-lg flex items-center gap-2"><Calendar className="w-4 h-4 text-action" /> My Schedule</CardTitle>
        <div className="flex items-center gap-2">
          {myTeams.length > 1 && (
            <MultiSelectFilter label="Teams" options={myTeams.map((t) => ({ value: t.id, label: t.name }))} selected={selectedTeams} onChange={setSelectedTeams} />
          )}
          <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
            <Button size="sm" variant={view === "list" ? "default" : "ghost"} className={view === "list" ? "bg-action text-action-text h-7" : "h-7"} onClick={() => setView("list")}>
              <List className="w-3.5 h-3.5 mr-1" /> List
            </Button>
            <Button size="sm" variant={view === "week" ? "default" : "ghost"} className={view === "week" ? "bg-action text-action-text h-7" : "h-7"} onClick={() => setView("week")}>
              <Grid className="w-3.5 h-3.5 mr-1" /> Week
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-action" /></div>
        ) : view === "week" ? (
          <WeekView events={filteredEvents} onEventClick={(e) => setSelectedEvent(e)} currentDate={navDate} onNavigate={setNavDate} />
        ) : filteredEvents.length === 0 ? (
          <p className="text-sm text-text-secondary py-8 text-center">No upcoming events{selectedTeams.length > 0 ? " for selected teams" : ""}.</p>
        ) : (
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredEvents.map((e) => {
              const att = getAttendance(e, myTeams);
              return (
                <div key={e.id} onClick={() => setSelectedEvent(e)} className="flex items-start gap-3 p-3 rounded-xl hover:bg-neutral-100 transition-colors border border-border-subtle cursor-pointer">
                  <div className="flex flex-col items-center justify-center w-14 shrink-0 bg-action/5 rounded-lg py-1.5">
                    <span className="text-[10px] font-bold uppercase text-action">{format(parseISO(e.start_datetime), "MMM")}</span>
                    <span className="text-xl font-bold text-text-action leading-none">{format(parseISO(e.start_datetime), "d")}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <Badge className={`text-[10px] capitalize border ${TYPE_COLORS[e.event_type] || TYPE_COLORS.other}`}>{e.event_type}</Badge>
                      {e.status !== "confirmed" && <Badge variant="outline" className="text-[10px] capitalize">{e.status}</Badge>}
                    </div>
                    <p className="font-medium text-sm text-text-action truncate">{e.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(parseISO(e.start_datetime), "h:mm a")}{e.end_datetime ? ` – ${format(parseISO(e.end_datetime), "h:mm a")}` : ""}</span>
                      {e.location_text && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location_text}</span>}
                      {e.team_names?.length > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{e.team_names.join(", ")}</span>}
                    </div>
                    {att.total > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex h-1.5 flex-1 rounded-full overflow-hidden bg-neutral-100">
                          <div className="bg-emerald-500" style={{ width: `${(att.attending / att.total) * 100}%` }} />
                          <div className="bg-red-400" style={{ width: `${(att.notAttending / att.total) * 100}%` }} />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] shrink-0">
                          <span className="flex items-center gap-0.5 text-emerald-600"><CheckCircle2 className="w-2.5 h-2.5" />{att.attending}</span>
                          <span className="flex items-center gap-0.5 text-red-500"><XCircle className="w-2.5 h-2.5" />{att.notAttending}</span>
                          <span className="flex items-center gap-0.5 text-neutral-400"><HelpCircle className="w-2.5 h-2.5" />{att.noResponse}</span>
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

      <EventDetailDialog
        open={!!selectedEvent}
        onOpenChange={(v) => !v && setSelectedEvent(null)}
        event={selectedEvent}
        teams={myTeams}
        players={players}
        guardians={guardians}
        canManage={canManage}
        onEdit={(e) => { setEditingEvent(e); setEditDialogOpen(true); setSelectedEvent(null); }}
      />

      {canManage && (
        <TeamEventDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          event={editingEvent}
          manageableTeams={myTeams}
        />
      )}
    </Card>
  );
}