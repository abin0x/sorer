import React from "react";
import { Activity, Brain, Dumbbell, Crosshair, Zap, Heart, Users, Gauge } from "lucide-react";

const METRICS = [
  { key: "overall", label: "Overall", icon: Gauge, color: "primary" },
  { key: "technical_ability", label: "Technical", icon: Crosshair, color: "blue" },
  { key: "tactical_awareness", label: "Tactical", icon: Brain, color: "purple" },
  { key: "physical_attributes", label: "Physical", icon: Dumbbell, color: "orange" },
  { key: "decision_making", label: "Decision", icon: Activity, color: "teal" },
  { key: "coachability", label: "Coachable", icon: Heart, color: "pink" },
  { key: "effort_competitiveness", label: "Effort", icon: Zap, color: "amber" },
  { key: "teamwork", label: "Teamwork", icon: Users, color: "green" },
];

const COLOR_MAP = {
  primary: { ring: "ring-primary/20", text: "text-primary", bar: "bg-primary", glow: "shadow-primary/20" },
  blue: { ring: "ring-blue-500/20", text: "text-blue-500", bar: "bg-blue-500", glow: "shadow-blue-500/20" },
  purple: { ring: "ring-purple-500/20", text: "text-purple-500", bar: "bg-purple-500", glow: "shadow-purple-500/20" },
  orange: { ring: "ring-orange-500/20", text: "text-orange-500", bar: "bg-orange-500", glow: "shadow-orange-500/20" },
  teal: { ring: "ring-teal-500/20", text: "text-teal-500", bar: "bg-teal-500", glow: "shadow-teal-500/20" },
  pink: { ring: "ring-pink-500/20", text: "text-pink-500", bar: "bg-pink-500", glow: "shadow-pink-500/20" },
  amber: { ring: "ring-amber-500/20", text: "text-amber-500", bar: "bg-amber-500", glow: "shadow-amber-500/20" },
  green: { ring: "ring-green-500/20", text: "text-green-500", bar: "bg-green-500", glow: "shadow-green-500/20" },
};

function scoreLabel(v) {
  if (v == null) return "Not Assessed";
  if (v >= 4.5) return "Elite";
  if (v >= 3.5) return "Advanced";
  if (v >= 2.5) return "Intermediate";
  if (v >= 1.5) return "Beginner";
  return "Developing";
}

export default function MetricGrid({ evaluation }) {
  const scores = ["technical_ability", "tactical_awareness", "physical_attributes", "decision_making", "coachability", "effort_competitiveness", "teamwork"];
  const numeric = scores.map((k) => evaluation?.[k]).filter((v) => typeof v === "number");
  const overall = numeric.length ? numeric.reduce((a, b) => a + b, 0) / numeric.length : null;

  const getValue = (key) => (key === "overall" ? overall : evaluation?.[key]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {METRICS.map((m) => {
        const val = getValue(m.key);
        const pct = val != null ? (val / 5) * 100 : 0;
        const c = COLOR_MAP[m.color];
        return (
          <div key={m.key} className={`metric-card ring-1 ${c.ring} hover:shadow-lg ${c.glow}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${c.text}`}>
                <m.icon className="w-4 h-4" />
              </div>
              <span className={`text-xs font-semibold ${c.text}`}>{scoreLabel(val)}</span>
            </div>
            <p className="section-title mb-1">{m.label}</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold tabular-nums">{val != null ? val.toFixed(1) : "—"}</span>
              <span className="text-xs text-muted-foreground mb-1">/ 5</span>
            </div>
            <div className="progress-track h-1.5 mt-2">
              <div className={`h-full rounded-full ${c.bar} transition-all`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}