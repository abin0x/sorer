import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Clock, MapPin, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { format, parseISO, isAfter, startOfDay, isSameDay } from "date-fns";

const TYPE_COLORS = {
  game: "bg-blue-100 text-blue-700 border-blue-200",
  practice: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function PlatformGameDay({ events, teams, players }) {
  const nextGameDay = useMemo(() => {
    const today = startOfDay(new Date());
    const games = events
      .filter((e) => e.event_type === "game" && e.start_datetime && (isAfter(parseISO(e.start_datetime), today) || isSameDay(parseISO(e.start_datetime), today)))
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    if (games.length === 0) return null;
    const firstDate = format(parseISO(games[0].start_datetime), "yyyy-MM-dd");
    return { date: firstDate, games: games.filter((g) => format(parseISO(g.start_datetime), "yyyy-MM-dd") === firstDate) };
  }, [events]);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> Upcoming Game Day</CardTitle>
      </CardHeader>
      <CardContent>
        {!nextGameDay ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No upcoming game days.</p>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-lg font-bold text-primary">{format(parseISO(nextGameDay.date + "T00:00:00"), "EEEE, MMMM d, yyyy")}</p>
              <p className="text-xs text-muted-foreground">{nextGameDay.games.length} games scheduled</p>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {nextGameDay.games.map((game) => {
                const team = teams.find((t) => (game.team_ids || []).includes(t.id));
                const rsvps = game.rsvps || {};
                const teamPlayers = players.filter((p) => p.team_id === team?.id);
                const attending = teamPlayers.filter((p) => rsvps[p.id] === "attending").length;
                const notAttending = teamPlayers.filter((p) => rsvps[p.id] === "not_attending").length;
                const noResponse = teamPlayers.filter((p) => !rsvps[p.id]).length;
                const pct = teamPlayers.length > 0 ? (attending / teamPlayers.length) * 100 : 0;
                return (
                  <div key={game.id} className="p-3 rounded-lg border border-border/40 bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-[10px] capitalize border ${TYPE_COLORS.game}`}>Game</Badge>
                      <p className="text-sm font-medium flex-1 truncate">{game.title}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(parseISO(game.start_datetime), "h:mm a")}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{game.location_text}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1"><Progress value={pct} className="h-1.5" /></div>
                      <div className="flex items-center gap-2 text-[10px] shrink-0">
                        <span className="flex items-center gap-0.5 text-emerald-600"><CheckCircle2 className="w-2.5 h-2.5" />{attending}</span>
                        <span className="flex items-center gap-0.5 text-red-500"><XCircle className="w-2.5 h-2.5" />{notAttending}</span>
                        <span className="flex items-center gap-0.5 text-slate-400"><HelpCircle className="w-2.5 h-2.5" />{noResponse}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}