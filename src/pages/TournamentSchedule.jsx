import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from '@/lib/router-compat';
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Trophy, UserPlus, BarChart3, ArrowLeft } from "lucide-react";

export default function TournamentSchedule() {
  const [params] = useSearchParams();
  const tournamentId = params.get("tournament");

  const [tournament, setTournament] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupBy, setGroupBy] = useState("date"); // date | round

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }
    Promise.all([
      base44.entities.Tournament.get(tournamentId).catch(() => null),
      base44.entities.Game.filter({ tournament_id: tournamentId }, { sort: "scheduled_date" }).catch(() => ({ items: [] })),
    ])
      .then(([t, g]) => {
        setTournament(t);
        setGames(g.items || []);
        if (!t) setError("Tournament not found.");
      })
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!tournamentId || (!tournament && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">No tournament selected. Use the schedule link from the tournament organizer.</p>
            <Link to="/"><Button variant="outline">Go Home</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group games
  const groups = {};
  for (const g of games) {
    const key = groupBy === "date" ? g.scheduled_date || "TBD" : g.round || "Unscheduled";
    if (!groups[key]) groups[key] = [];
    groups[key].push(g);
  }
  const groupKeys = Object.keys(groups).sort();

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        {tournament?.banner_url && (
          <img src={tournament.banner_url} alt={tournament.name} className="w-full h-48 object-cover rounded-xl mb-6" />
        )}

        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{tournament?.name}</h1>
            <p className="text-slate-500 text-sm">Tournament Schedule</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {tournament?.age_group && <Badge variant="secondary">{tournament.age_group}</Badge>}
          {tournament?.gender && <Badge variant="secondary">{tournament.gender}</Badge>}
          {tournament?.format && <Badge variant="outline">{tournament.format.replace(/_/g, " ")}</Badge>}
          {tournament?.start_date && tournament?.end_date && (
            <Badge variant="outline">{tournament.start_date} — {tournament.end_date}</Badge>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          {tournament?.status === "registration_open" && (
            <Link to={`/TournamentRegistration?tournament=${tournamentId}`}>
              <Button><UserPlus className="w-4 h-4 mr-2" />Register Team</Button>
            </Link>
          )}
          <Link to={`/TournamentStandings?tournament=${tournamentId}`}>
            <Button variant="outline"><BarChart3 className="w-4 h-4 mr-2" />Standings</Button>
          </Link>
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant={groupBy === "date" ? "default" : "outline"} onClick={() => setGroupBy("date")}>By Date</Button>
            <Button size="sm" variant={groupBy === "round" ? "default" : "outline"} onClick={() => setGroupBy("round")}>By Round</Button>
          </div>
        </div>

        {games.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-slate-500">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>Schedule has not been published yet. Check back soon.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupKeys.map((key) => (
              <div key={key}>
                <h2 className="text-lg font-semibold mb-3 capitalize">
                  {groupBy === "date" ? new Date(key).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : key}
                </h2>
                <div className="space-y-2">
                  {groups[key].map((g) => (
                    <Card key={g.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-slate-400">#{g.game_number || ""}</span>
                              {g.round && <Badge variant="outline" className="text-xs">{g.round}</Badge>}
                              {g.status === "completed" && <Badge className="bg-emerald-100 text-emerald-700">Final</Badge>}
                              {g.status === "in_progress" && <Badge className="bg-amber-100 text-amber-700">Live</Badge>}
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <div className={`flex-1 text-right ${g.status === "completed" && g.home_score > g.away_score ? "font-bold" : ""}`}>
                                {g.home_team_name}
                                {g.status === "completed" && <span className="ml-2 text-lg">{g.home_score}</span>}
                              </div>
                              <span className="text-xs text-slate-400 px-2">vs</span>
                              <div className={`flex-1 ${g.status === "completed" && g.away_score > g.home_score ? "font-bold" : ""}`}>
                                {g.status === "completed" && <span className="mr-2 text-lg">{g.away_score}</span>}
                                {g.away_team_name}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t text-xs text-slate-500">
                          {g.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{g.start_time}{g.end_time ? ` – ${g.end_time}` : ""}</span>}
                          {g.field_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{g.field_name}{g.facility_name ? `, ${g.facility_name}` : ""}</span>}
                          {g.referee_name && <span className="flex items-center gap-1"><UserPlus className="w-3 h-3" />{g.referee_name}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}