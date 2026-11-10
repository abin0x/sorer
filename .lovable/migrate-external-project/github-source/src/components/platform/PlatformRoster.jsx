import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { computePlayerAttendance } from "./attendanceUtils";
import SearchableSelect from "@/components/tryout/SearchableSelect";

export default function PlatformRoster({ teams, players, events }) {
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || "");
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const teamPlayers = useMemo(() => players.filter((p) => p.team_id === selectedTeamId), [players, selectedTeamId]);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Roster</CardTitle>
        {teams.length > 0 && (
          <div className="w-56">
            <SearchableSelect value={selectedTeamId} onChange={setSelectedTeamId} options={teams.map((t) => ({ value: t.id, label: t.name }))} placeholder="Select team..." />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {teamPlayers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No players on this team.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                  <th className="text-left py-2 px-2">Player</th>
                  <th className="text-center py-2 px-2">Birth Year</th>
                  <th className="text-center py-2 px-2">Training %</th>
                  <th className="text-center py-2 px-2">Game %</th>
                  <th className="text-center py-2 px-2">Overall %</th>
                </tr>
              </thead>
              <tbody>
                {teamPlayers.map((p) => {
                  const att = computePlayerAttendance(p.id, events, selectedTeamId);
                  const birthYear = p.date_of_birth ? new Date(p.date_of_birth).getFullYear() : "—";
                  return (
                    <tr key={p.id} className="border-b border-border/40 hover:bg-muted/30">
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{p.first_name?.[0]}{p.last_name?.[0]}</div>
                          <span className="font-medium">{p.first_name} {p.last_name}</span>
                        </div>
                      </td>
                      <td className="text-center py-2 px-2 text-muted-foreground">{birthYear}</td>
                      <td className="text-center py-2 px-2">
                        <div className="flex items-center gap-1.5 justify-center">
                          <div className="w-16"><Progress value={att.trainingPct} className="h-1.5" /></div>
                          <span className="text-xs font-medium w-8 text-left">{att.trainingPct}%</span>
                        </div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <div className="flex items-center gap-1.5 justify-center">
                          <div className="w-16"><Progress value={att.gamePct} className="h-1.5" /></div>
                          <span className="text-xs font-medium w-8 text-left">{att.gamePct}%</span>
                        </div>
                      </td>
                      <td className="text-center py-2 px-2">
                        <Badge variant={att.overallPct >= 75 ? "default" : att.overallPct >= 50 ? "secondary" : "outline"} className="text-[10px]">{att.overallPct}%</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}