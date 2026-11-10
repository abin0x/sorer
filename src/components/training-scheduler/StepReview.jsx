import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, AlertCircle, CheckCircle2, Users, Clock, Building2, Scale } from "lucide-react";
import { minToLabel } from "@/lib/trainingSchedulerConfig";

export default function StepReview({ activeScenario, onPrev, onNext }) {
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  const sc = activeScenario?.scorecard || {};
  const sessions = activeScenario?.sessions || [];
  const unscheduled = activeScenario?.unscheduled || [];

  return (
    <div className="space-y-4">
      {/* Scorecard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ScoreTile icon={CheckCircle2} label="Placed" value={`${sc.percent_placed || 0}%`} sub={`${sc.placed_count || 0}/${sc.total_sessions || 0}`} tone={sc.percent_placed >= 90 ? "emerald" : sc.percent_placed >= 70 ? "amber" : "red"} />
        <ScoreTile icon={Users} label="Coach Gaps" value={sc.coach_gaps || 0} sub="sessions w/o coach" tone={sc.coach_gaps > 0 ? "amber" : "emerald"} />
        <ScoreTile icon={Building2} label="Facility Switches" value={sc.facility_switches || 0} sub="across teams" tone={sc.facility_switches > 5 ? "amber" : "emerald"} />
        <ScoreTile icon={Scale} label="Fairness" value={`${sc.fairness_score || 0}%`} sub="late-slot rotation" tone={sc.fairness_score >= 70 ? "emerald" : "amber"} />
      </div>

      {/* Unscheduled */}
      {unscheduled.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4" /> {unscheduled.length} Unscheduled Sessions
              <Button size="sm" variant="ghost" onClick={() => setShowUnscheduled(!showUnscheduled)}>
                {showUnscheduled ? "Hide" : "Show"}
              </Button>
            </CardTitle>
          </CardHeader>
          {showUnscheduled && (
            <CardContent className="pt-0 space-y-1.5">
              {unscheduled.map((u, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200">
                  <Badge variant="destructive" className="text-xs">{u.team_name}</Badge>
                  <span className="text-xs text-muted-foreground">{u.reason}</span>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Session table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Generated Sessions ({sessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-3">Team</th>
                  <th className="pb-2 pr-3">Platform</th>
                  <th className="pb-2 pr-3">Day</th>
                  <th className="pb-2 pr-3">Time</th>
                  <th className="pb-2 pr-3">Field</th>
                  <th className="pb-2 pr-3">Grid</th>
                  <th className="pb-2 pr-3">Coach</th>
                  <th className="pb-2">Why Here?</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 50).map((s, i) => (
                  <tr key={s.key || i} className={`border-b hover:bg-muted/20 ${s.locked ? "bg-blue-50/50" : ""}`}>
                    <td className="py-2 pr-3 font-medium">{s.team_name}</td>
                    <td className="py-2 pr-3"><Badge variant="outline" className="text-xs">{s.platform_name || "—"}</Badge></td>
                    <td className="py-2 pr-3">{s.day}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{s.start_time}–{s.end_time}</td>
                    <td className="py-2 pr-3">{s.field_name}</td>
                    <td className="py-2 pr-3"><Badge className="bg-primary/10 text-primary text-xs">{s.grid_label}</Badge></td>
                    <td className="py-2 pr-3 text-xs">{(s.coach_names || []).join(", ") || "—"}</td>
                    <td className="py-2 text-xs text-muted-foreground italic max-w-xs">{s.why_here}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sessions.length > 50 && <p className="text-xs text-muted-foreground mt-2">Showing first 50 of {sessions.length} sessions.</p>}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}><ArrowLeft className="w-4 h-4" /> Back</Button>
        <Button onClick={onNext}>Continue to Edit & Lock <ArrowRight className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}

function ScoreTile({ icon: Icon, label, value, sub, tone }) {
  const tones = { emerald: "text-emerald-600 bg-emerald-50 border-emerald-200", amber: "text-amber-600 bg-amber-50 border-amber-200", red: "text-red-600 bg-red-50 border-red-200" };
  return (
    <Card className={`border ${tones[tone] || tones.emerald}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4" />
          <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
        </div>
        <p className="text-xl font-extrabold">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}