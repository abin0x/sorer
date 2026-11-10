import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SkillRadar from "./SkillRadar";

const BARS = [
  { key: "technical_ability", label: "First Touch / Technical" },
  { key: "tactical_awareness", label: "Passing / Tactical" },
  { key: "physical_attributes", label: "Dribbling / Physical" },
  { key: "decision_making", label: "Decision Making" },
  { key: "coachability", label: "Coachability" },
  { key: "effort_competitiveness", label: "Effort / Competitiveness" },
  { key: "teamwork", label: "Teamwork" },
];

export default function EvaluationPanel({ evaluation }) {
  if (!evaluation) {
    return (
      <Card className="adisal-card">
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">No evaluation recorded</p>
          <p className="text-xs text-muted-foreground mt-1">Complete an evaluation from the Recruiting tab to populate this panel.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Radar + bars side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="adisal-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" /> Overall Proficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SkillRadar evaluation={evaluation} />
          </CardContent>
        </Card>

        <Card className="adisal-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Skill Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {BARS.map((b) => {
              const val = evaluation[b.key];
              const pct = typeof val === "number" ? (val / 5) * 100 : 0;
              return (
                <div key={b.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{b.label}</span>
                    <span className="font-semibold tabular-nums">{typeof val === "number" ? `${val}/5` : "—"}</span>
                  </div>
                  <div className="progress-track h-2">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Strengths / Growth / Training Focus */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="adisal-card border-green-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-green-600 dark:text-green-400">Strengths</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {evaluation.parent_visible_feedback || "Not yet documented."}
            </p>
          </CardContent>
        </Card>
        <Card className="adisal-card border-amber-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-600 dark:text-amber-400">Areas of Growth</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {evaluation.position_specific_notes || "Not yet documented."}
            </p>
          </CardContent>
        </Card>
        <Card className="adisal-card border-primary/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-primary">Training Focus</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {evaluation.placement_recommendation || "Not yet documented."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}