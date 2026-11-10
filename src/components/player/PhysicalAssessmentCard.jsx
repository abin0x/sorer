import React from "react";
import { format } from "date-fns";
import { computePhysicalSubScores } from "@/lib/testScoring";

// Circular progress ring showing a 0-100 score
function ScoreRing({ score, label, color, rank }) {
  const pct = score ?? 0;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#E5E7EB" strokeWidth="5" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-extrabold text-slate-800">{score ?? "—"}</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-slate-500 mt-1">{label}</span>
      {rank && <span className="text-[9px] text-slate-400">#{rank}</span>}
    </div>
  );
}

const RAW_STYLES = {
  sprint: { bg: "#FEE2E2", text: "#B91C1C", label: "Sprint" },
  vertical: { bg: "#DBEAFE", text: "#1D4ED8", label: "Vertical" },
  yoyo: { bg: "#DCFCE7", text: "#15803D", label: "YIRT" },
  shuttle: { bg: "#FCE7F3", text: "#BE185D", label: "Shuttle" },
};

const RING_COLORS = {
  speed: "#EF4444",
  power: "#3B82F6",
  endurance: "#22C55E",
  agility: "#EC4899",
};

// One player physical assessment card, matching the reference screenshot layout
export default function PhysicalAssessmentCard({ assessment, benchmarks, gender, rank }) {
  if (!assessment) return null;
  const subScores = computePhysicalSubScores(assessment, benchmarks, gender);
  const overall = assessment.overall ?? (Object.values(subScores).filter((v) => v != null).length
    ? Math.round(Object.values(subScores).filter((v) => v != null).reduce((a, b) => a + b, 0) / Object.values(subScores).filter((v) => v != null).length)
    : null);

  const raws = [
    { key: "sprint", value: assessment.sprint_20m_seconds, suffix: "s" },
    { key: "vertical", value: assessment.vertical_jump_inches, suffix: '"' },
    { key: "yoyo", value: assessment.yoyo_level, suffix: "" },
    { key: "shuttle", value: assessment.agility_5_10_5_seconds, suffix: "s" },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
          {assessment.player_name?.[0] || "P"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">{assessment.player_name}</p>
          <p className="text-xs text-slate-400">{assessment.assessment_date ? format(new Date(assessment.assessment_date), "M/d/yyyy") : "—"}</p>
        </div>
      </div>

      {/* Raw metric boxes */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {raws.map((r) => {
          const s = RAW_STYLES[r.key];
          return (
            <div key={r.key} className="rounded-lg p-2.5" style={{ background: s.bg }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: s.text }}>{s.label}</p>
              <p className="text-base font-bold" style={{ color: s.text }}>
                {r.value != null ? `${r.value}${r.suffix}` : "—"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Score rings */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {["speed", "power", "endurance", "agility"].map((k) => (
          <ScoreRing key={k} score={subScores[k]} label={k.charAt(0).toUpperCase() + k.slice(1)} color={RING_COLORS[k]} rank={rank?.[k]} />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-xs font-semibold text-slate-500">Overall Score</span>
        <span className="text-sm font-extrabold text-slate-800">{overall ?? "—"}</span>
      </div>
    </div>
  );
}