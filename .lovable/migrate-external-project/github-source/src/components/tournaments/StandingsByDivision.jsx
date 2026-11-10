import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Renders standings grouped by division (group_name). When no divisions exist,
// falls back to a single table. Sorts within each group by position.
export default function StandingsByDivision({ standings }) {
  const hasDivisions = standings.some((s) => s.group_name);
  const groups = {};
  for (const s of standings) {
    const key = s.group_name || "Standings";
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  const groupKeys = Object.keys(groups).sort();

  return (
    <div className="space-y-4">
      {groupKeys.map((key) => (
        <Card key={key}>
          <CardContent className="p-4">
            {hasDivisions && (
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary">{key}</Badge>
                <span className="text-xs text-slate-400">{groups[key].length} teams</span>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-2">#</th>
                    <th className="text-left py-2 px-2">Team</th>
                    <th className="text-center py-2 px-2" title="Played">P</th>
                    <th className="text-center py-2 px-2" title="Won">W</th>
                    <th className="text-center py-2 px-2" title="Drawn">D</th>
                    <th className="text-center py-2 px-2" title="Lost">L</th>
                    <th className="text-center py-2 px-2" title="Goals For">GF</th>
                    <th className="text-center py-2 px-2" title="Goals Against">GA</th>
                    <th className="text-center py-2 px-2" title="Goal Difference">GD</th>
                    <th className="text-center py-2 px-2 text-primary font-bold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {groups[key].sort((a, b) => (a.position || 0) - (b.position || 0)).map((s, i) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2 px-2 text-slate-400">{s.position || i + 1}</td>
                      <td className="py-2 px-2 font-medium">{s.team_name}</td>
                      <td className="text-center py-2 px-2">{s.played || 0}</td>
                      <td className="text-center py-2 px-2">{s.won || 0}</td>
                      <td className="text-center py-2 px-2">{s.drawn || 0}</td>
                      <td className="text-center py-2 px-2">{s.lost || 0}</td>
                      <td className="text-center py-2 px-2">{s.goals_for || 0}</td>
                      <td className="text-center py-2 px-2">{s.goals_against || 0}</td>
                      <td className="text-center py-2 px-2">{(s.goal_difference || 0) > 0 ? "+" : ""}{s.goal_difference || 0}</td>
                      <td className="text-center py-2 px-2 font-bold text-primary">{s.points || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}