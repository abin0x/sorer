import React from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";

const AXES = [
  { key: "technical_ability", label: "Technical" },
  { key: "tactical_awareness", label: "Tactical" },
  { key: "physical_attributes", label: "Physical" },
  { key: "decision_making", label: "Decision" },
  { key: "coachability", label: "Coachable" },
  { key: "effort_competitiveness", label: "Effort" },
  { key: "teamwork", label: "Teamwork" },
];

export default function SkillRadar({ evaluation }) {
  const data = AXES.map((a) => ({
    subject: a.label,
    score: typeof evaluation?.[a.key] === "number" ? evaluation[a.key] : 0,
    fullMark: 5,
  }));
  const hasData = data.some((d) => d.score > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <span className="text-2xl">📊</span>
        </div>
        <p className="text-sm font-medium text-muted-foreground">No skill data yet</p>
        <p className="text-xs text-muted-foreground mt-1">Complete an evaluation to see the skill radar.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 5]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} stroke="hsl(var(--border))" />
        <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} strokeWidth={2} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}