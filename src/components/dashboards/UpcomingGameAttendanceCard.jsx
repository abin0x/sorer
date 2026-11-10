import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, CheckCircle2, XCircle, HelpCircle, Clock, MapPin, Bell, ChevronDown, ChevronUp } from "lucide-react";
import { format, parseISO, isAfter, startOfDay, isSameDay } from "date-fns";
import { toast } from "sonner";

export default function UpcomingGameAttendanceCard({ events, myTeams, myPlayers }) {
  const [expandedGame, setExpandedGame] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const { data: guardians = [] } = useQuery({ queryKey: ["game-att-guardians"], queryFn: () => base44.entities.Guardian.list("-created_date", 300) });

  const upcomingGames = useMemo(() => {
    const today = startOfDay(new Date());
    return events
      .filter((e) => e.event_type === "game" && e.start_datetime)
      .filter((e) => (isAfter(parseISO(e.start_datetime), today) || isSameDay(parseISO(e.start_datetime), today)))
      .filter((e) => (e.team_ids || []).some((id) => myTeams.some((t) => t.id === id)))
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 3);
  }, [events, myTeams]);

  const gamesWithAttendance = useMemo(() => {
    return upcomingGames.map((game) => {
      const teamIds = game.team_ids || [];
      const playerIds = [...new Set(myTeams.filter((t) => teamIds.includes(t.id)).flatMap((t) => t.player_ids || []))];
      const rsvps = game.rsvps || {};
      const attending = [], notAttending = [], noResponse = [];
      for (const pid of playerIds) {
        const player = myPlayers?.find((p) => p.id === pid);
        if (rsvps[pid] === "attending") attending.push(player);
        else if (rsvps[pid] === "not_attending") notAttending.push(player);
        else noResponse.push(player);
      }
      return { game, attending, notAttending, noResponse, total: playerIds.length };
    });
  }, [upcomingGames, myTeams, myPlayers]);

  const handleReminder = async (e, gameId) => {
    e.stopPropagation();
    setSendingId(gameId);
    try {
      const res = await base44.functions.invoke("sendRsvpReminder", { event_id: gameId });
      toast.success(`Reminder sent to ${res.data.sent} non-responder${res.data.sent !== 1 ? "s" : ""}`);
    } catch (err) { toast.error("Failed to send reminders"); }
    setSendingId(null);
  };

  if (gamesWithAttendance.length === 0) {
    return (
      <Card className="soft-shadow border-border-subtle animate-fadeInUp">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Trophy className="w-4 h-4 text-action" /> Upcoming Game Attendance</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-text-secondary py-6 text-center">No upcoming games.</p></CardContent>
      </Card>
    );
  }

  const renderPlayer = (p) => {
    const guardian = guardians.find((g) => g.id === p?.guardian_id);
    return (
      <div key={p?.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-neutral-50 border border-border-subtle">
        <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-[9px] font-bold text-action shrink-0">{p?.first_name?.[0]}{p?.last_name?.[0]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{p?.first_name} {p?.last_name}</p>
          {guardian && <p className="text-[9px] text-text-secondary truncate">{guardian.first_name} {guardian.last_name}</p>}
        </div>
      </div>
    );
  };

  return (
    <Card className="soft-shadow border-border-subtle animate-fadeInUp">
      <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Trophy className="w-4 h-4 text-action" /> Upcoming Game Attendance</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {gamesWithAttendance.map(({ game, attending, notAttending, noResponse, total }) => {
          const pct = total > 0 ? (attending.length / total) * 100 : 0;
          const isExpanded = expandedGame === game.id;
          return (
            <div key={game.id} className="rounded-xl border border-border-subtle overflow-hidden">
              <div onClick={() => setExpandedGame(isExpanded ? null : game.id)} className="p-3 bg-neutral-50 cursor-pointer hover:bg-neutral-100 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-text-action">{game.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary flex-wrap">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(parseISO(game.start_datetime), "EEE, MMM d · h:mm a")}</span>
                      {game.location_text && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{game.location_text}</span>}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-text-secondary shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-secondary shrink-0" />}
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1"><span className="text-text-secondary">Attending</span><span className="font-medium">{attending.length} / {total}</span></div>
                  <Progress value={pct} className="h-1.5" />
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-center"><CheckCircle2 className="w-3 h-3 text-emerald-600 mx-auto" /><p className="text-xs font-bold text-emerald-700">{attending.length}</p></div>
                  <div className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-center"><XCircle className="w-3 h-3 text-red-600 mx-auto" /><p className="text-xs font-bold text-red-700">{notAttending.length}</p></div>
                  <div className="p-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-center"><HelpCircle className="w-3 h-3 text-neutral-500 mx-auto" /><p className="text-xs font-bold text-neutral-600">{noResponse.length}</p></div>
                </div>
              </div>
              {isExpanded && (
                <div className="p-3 space-y-2 border-t border-border-subtle">
                  {noResponse.length > 0 && (
                    <Button onClick={(e) => handleReminder(e, game.id)} disabled={sendingId === game.id} size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs">
                      <Bell className="w-3 h-3 mr-1" /> {sendingId === game.id ? "Sending…" : `Send Reminder to ${noResponse.length} Non-Responder${noResponse.length !== 1 ? "s" : ""}`}
                    </Button>
                  )}
                  {attending.length > 0 && (<div><p className="text-[10px] font-semibold text-emerald-700 mb-1">ATTENDING ({attending.length})</p><div className="space-y-1">{attending.map(renderPlayer)}</div></div>)}
                  {notAttending.length > 0 && (<div><p className="text-[10px] font-semibold text-red-600 mb-1">NOT ATTENDING ({notAttending.length})</p><div className="space-y-1">{notAttending.map(renderPlayer)}</div></div>)}
                  {noResponse.length > 0 && (<div><p className="text-[10px] font-semibold text-neutral-500 mb-1">NO RESPONSE ({noResponse.length})</p><div className="space-y-1">{noResponse.map(renderPlayer)}</div></div>)}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}