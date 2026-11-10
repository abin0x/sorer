import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Dumbbell, Trophy, CalendarCheck } from "lucide-react";
import { computePlatformAttendance, computeTeamAttendance } from "./attendanceUtils";

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`p-4 rounded-xl border ${color}`}>
      <div className="flex items-center gap-2 mb-1"><Icon className="w-4 h-4" /><p className="text-xs font-semibold uppercase tracking-wide">{label}</p></div>
      <p className="text-3xl font-bold">{value}%</p>
      <Progress value={value} className="h-1.5 mt-2" />
    </div>
  );
}

export default function PlatformAttendanceStats({ platformName, teams, players, events }) {
  const platformAtt = computePlatformAttendance(teams, players, events);

  return (
    <Card className="border-border/60">
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Attendance Analytics — {platformName}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {/* Platform-wide stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard icon={Dumbbell} label="Training" value={platformAtt.trainingPct} color="bg-emerald-50 border-emerald-200 text-emerald-700" />
          <StatCard icon={Trophy} label="Games" value={platformAtt.gamePct} color="bg-blue-50 border-blue-200 text-blue-700" />
          <StatCard icon={CalendarCheck} label="Overall" value={platformAtt.overallPct} color="bg-purple-50 border-purple-200 text-purple-700" />
        </div>

        {/* Per-team breakdown */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Per-Team Breakdown</p>
          {teams.map((team) => {
            const att = computeTeamAttendance(team, players, events);
            return (
              <div key={team.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/40">
                <div className="w-40 shrink-0">
                  <p className="text-sm font-medium truncate">{team.name}</p>
                  <p className="text-[10px] text-muted-foreground">{att.playerCount} players</p>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5"><span className="text-muted-foreground">Training</span><span className="font-medium">{att.trainingPct}%</span></div>
                    <Progress value={att.trainingPct} className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5"><span className="text-muted-foreground">Games</span><span className="font-medium">{att.gamePct}%</span></div>
                    <Progress value={att.gamePct} className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5"><span className="text-muted-foreground">Overall</span><span className="font-medium">{att.overallPct}%</span></div>
                    <Progress value={att.overallPct} className="h-1.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}