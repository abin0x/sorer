import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Trophy, Calendar, ArrowLeft } from "lucide-react";

export default function TournamentStandings() {
  const [params] = useSearchParams();
  const tournamentId = params.get("tournament");

  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }
    Promise.all([
      base44.entities.Tournament.get(tournamentId).catch(() => null),
      base44.entities.Standing.filter({ tournament_id: tournamentId }, { sort: "position" }).catch(() => ({ items: [] })),
    ])
      .then(([t, s]) => {
        setTournament(t);
        setStandings(s.items || []);
      })
      .finally(() => setLoading(false));
  }, [tournamentId]);

  // Real-time: auto-refresh standings when the workflow recalculates them
  useEffect(() => {
    if (!tournamentId) return;
    const unsubscribe = base44.entities.Standing.subscribe(() => {
      base44.entities.Standing.filter({ tournament_id: tournamentId }, { sort: "position" })
        .then((page) => setStandings(page.items || []))
        .catch(() => {});
    });
    return unsubscribe;
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!tournamentId || !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">No tournament selected.</p>
            <Link to="/"><Button variant="outline">Go Home</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group by group_name if any
  const hasGroups = standings.some((s) => s.group_name);
  const groups = {};
  for (const s of standings) {
    const key = s.group_name || "Standings";
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  const groupKeys = Object.keys(groups).sort();

  const pWin = tournament.points_win ?? 3;
  const pDraw = tournament.points_draw ?? 1;
  const pLoss = tournament.points_loss ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
            <p className="text-slate-500 text-sm flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Standings
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {tournament.age_group && <Badge variant="secondary">{tournament.age_group}</Badge>}
          {tournament.gender && <Badge variant="secondary">{tournament.gender}</Badge>}
          <Badge variant="outline">Win={pWin} pts · Draw={pDraw} · Loss={pLoss}</Badge>
        </div>

        <div className="flex gap-2 mb-6">
          <Link to={`/TournamentSchedule?tournament=${tournamentId}`}>
            <Button variant="outline"><Calendar className="w-4 h-4 mr-2" />View Schedule</Button>
          </Link>
          {tournament.status === "registration_open" && (
            <Link to={`/TournamentRegistration?tournament=${tournamentId}`}>
              <Button>Register Team</Button>
            </Link>
          )}
        </div>

        {standings.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-slate-500">
              <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>Standings will appear once games are played.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupKeys.map((key) => (
              <div key={key}>
                {hasGroups && <h2 className="text-lg font-semibold mb-3">{key}</h2>}
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium text-slate-500">#</th>
                          <th className="text-left px-4 py-3 font-medium text-slate-500">Team</th>
                          <th className="text-center px-3 py-3 font-medium text-slate-500" title="Played">P</th>
                          <th className="text-center px-3 py-3 font-medium text-slate-500" title="Won">W</th>
                          <th className="text-center px-3 py-3 font-medium text-slate-500" title="Drawn">D</th>
                          <th className="text-center px-3 py-3 font-medium text-slate-500" title="Lost">L</th>
                          <th className="text-center px-3 py-3 font-medium text-slate-500" title="Goals For">GF</th>
                          <th className="text-center px-3 py-3 font-medium text-slate-500" title="Goals Against">GA</th>
                          <th className="text-center px-3 py-3 font-medium text-slate-500" title="Goal Difference">GD</th>
                          <th className="text-center px-4 py-3 font-medium text-primary">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groups[key].map((s, i) => (
                          <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-400">{s.position || i + 1}</td>
                            <td className="px-4 py-3 font-medium">{s.team_name}</td>
                            <td className="text-center px-3 py-3">{s.played || 0}</td>
                            <td className="text-center px-3 py-3">{s.won || 0}</td>
                            <td className="text-center px-3 py-3">{s.drawn || 0}</td>
                            <td className="text-center px-3 py-3">{s.lost || 0}</td>
                            <td className="text-center px-3 py-3">{s.goals_for || 0}</td>
                            <td className="text-center px-3 py-3">{s.goals_against || 0}</td>
                            <td className="text-center px-3 py-3">{(s.goal_difference || 0) > 0 ? "+" : ""}{s.goal_difference || 0}</td>
                            <td className="text-center px-4 py-3 font-bold text-primary">{s.points || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}