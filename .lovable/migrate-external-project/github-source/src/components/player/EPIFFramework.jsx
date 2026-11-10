import React from "react";
import { Zap, Crosshair, Brain, Sword } from "lucide-react";

const PILLARS = [
  { letter: "E", name: "Explosive", desc: "Speed, power & acceleration", icon: Zap, color: "orange", field: "physical_attributes" },
  { letter: "P", name: "Precise", desc: "Technical accuracy & control", icon: Crosshair, color: "blue", field: "technical_ability" },
  { letter: "I", name: "Insightful", desc: "Tactical awareness & vision", icon: Brain, color: "purple", field: "tactical_awareness" },
  { letter: "F", name: "Combative", desc: "Effort, grit & competitiveness", icon: Sword, color: "red", field: "effort_competitiveness" },
];

const COLOR_MAP = {
  orange: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-500", bar: "bg-orange-500" },
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-500", bar: "bg-blue-500" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-500", bar: "bg-purple-500" },
  red: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-500", bar: "bg-red-500" },
};

export default function EPIFFramework({ evaluation }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {PILLARS.map((p) => {
        const val = evaluation?.[p.field];
        const pct = typeof val === "number" ? (val / 5) * 100 : 0;
        const c = COLOR_MAP[p.color];
        return (
          <div key={p.letter} className={`adisal-card ${c.bg} ${c.border} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center ${c.text} font-bold text-lg`}>
                {p.letter}
              </div>
              <div>
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Score</span>
              <span className={`font-bold tabular-nums ${c.text}`}>{typeof val === "number" ? `${val}/5` : "—"}</span>
            </div>
            <div className="progress-track h-2">
              <div className={`h-full rounded-full ${c.bar} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <button className="text-xs text-muted-foreground hover:text-foreground mt-3 flex items-center gap-1">
              View Resources →
            </button>
          </div>
        );
      })}
    </div>
  );
}