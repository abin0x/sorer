import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Link } from '@/lib/router-compat';
import { createPageUrl } from "@/utils";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { computePhysicalScore, computePhysicalSubScores } from "@/lib/testScoring";
import RadialScoreChart from "./RadialScoreChart";

export default function PhysicalAssessmentHistory({ playerId, benchmarks, gender, assessments, compact = false }) {
  const { data: allAssessments = [] } = useQuery({
    queryKey: ["player-physical", playerId],
    queryFn: () => base44.entities.PhysicalAssessment.filter({ player_id: playerId }, "-assessment_date", 200),
    enabled: !assessments && !!playerId,
  });
  const data = assessments || allAssessments;

  const sorted = useMemo(() => [...data].sort((a, b) => new Date(b.assessment_date) - new Date(a.assessment_date)), [data]);

  const [idx, setIdx] = useState(0);
  const current = sorted[idx];

  if (!sorted.length) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground mb-3">No physical assessments recorded yet.</p>
        <Link to={createPageUrl("TestDayManager")}>
          <Button size="sm" className="bg-primary hover:bg-primary/90"><Plus className="w-3.5 h-3.5 mr-1.5" /> Log Physical Test</Button>
        </Link>
      </div>
    );
  }

  const currentScore = computePhysicalScore(current, benchmarks, gender);
  const subScores = computePhysicalSubScores(current, benchmarks, gender);

  return (
    <div className="space-y-4">
      {/* Carousel: one assessment at a time */}
      <div className="surface-tile rounded-lg p-4">
        {/* Carousel header with arrows */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIdx(i => Math.min(i + 1, sorted.length - 1))}
              disabled={idx >= sorted.length - 1}
              className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous assessment"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center min-w-[160px]">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Assessment</p>
              <p className="text-sm font-semibold">{current.assessment_date ? format(new Date(current.assessment_date), "MMM d, yyyy") : "—"}</p>
            </div>
            <button
              onClick={() => setIdx(i => Math.max(i - 1, 0))}
              disabled={idx <= 0}
              className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next assessment"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground">{idx + 1} of {sorted.length}</span>
        </div>

        {/* Score banner */}
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 mb-3">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Physical Score</p>
            <p className="text-2xl font-extrabold text-blue-600">{currentScore ?? "—"}<span className="text-sm text-muted-foreground">%</span></p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{sorted.length} assessment{sorted.length !== 1 ? "s" : ""} on file</p>
          </div>
        </div>

        {/* Radial chart */}
        {!compact && (
          <RadialScoreChart
            data={[
              { name: "Speed", value: current.speed || 0, color: "#EF4444" },
              { name: "Power", value: current.power || 0, color: "#3B82F6" },
              { name: "Agility", value: current.agility || 0, color: "#EC4899" },
              { name: "Endurance", value: current.endurance || 0, color: "#22C55E" },
            ]}
            centerLabel="Physical"
            centerValue={`${currentScore ?? "—"}%`}
          />
        )}

        {/* Raw values grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          <RawValue label="Sprint 20m" value={current.sprint_20m_seconds} unit="s" />
          <RawValue label="Vertical Jump" value={current.vertical_jump_inches} unit="in" />
          <RawValue label="5-10-5 Shuttle" value={current.agility_5_10_5_seconds} unit="s" />
          <RawValue label="Yo-Yo Level" value={current.yoyo_level} unit="" />
        </div>

        {/* Sub-scores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
          <ScoreTile label="Speed" value={subScores.speed} color="text-red-500" />
          <ScoreTile label="Power" value={subScores.power} color="text-blue-500" />
          <ScoreTile label="Agility" value={subScores.agility} color="text-pink-500" />
          <ScoreTile label="Endurance" value={subScores.endurance} color="text-green-500" />
        </div>

        {current.notes && (
          <div className="mt-3 p-2 rounded-lg bg-muted/20 border border-border">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-0.5">Notes</p>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{current.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RawValue({ label, value, unit }) {
  return (
    <div className="p-2 rounded-lg bg-muted/20 border border-border text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value ?? "—"}{value != null && unit && <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>}</p>
    </div>
  );
}

function ScoreTile({ label, value, color }) {
  return (
    <div className="p-2 rounded-lg bg-muted/10 border border-border text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value ?? "—"}</p>
    </div>
  );
}