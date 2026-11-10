import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { scoreFromBenchmark } from "@/lib/testScoring";

// Recalculates all physical assessment scores and skill test levels for the
// current club using the club's benchmarks.
export default function RecalculateScoresButton() {
  const qc = useQueryClient();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleRecalculate = async () => {
    setProcessing(true);
    setResult(null);
    try {
      // 1. Fetch all benchmarks for the current club
      const benchmarks = await base44.entities.TestBenchmark.list("-created_date", 500);
      const physBenchmarks = benchmarks.filter((b) => b.category === "physical");
      const skillBenchmarks = benchmarks.filter((b) => b.category === "skill");

      if (!benchmarks.length) {
        toast.error("No benchmarks found for this club. Configure test settings first.");
        setProcessing(false);
        return;
      }

      // 2. Fetch all players (for gender) and physical assessments
      const [players, assessments] = await Promise.all([
        base44.entities.Player.list("-created_date", 500),
        base44.entities.PhysicalAssessment.list("-created_date", 5000),
      ]);

      const playerGenderMap = new Map(players.map((p) => [p.id, p.gender === "Boys" ? "male" : "female"]));

      // 3. Recompute physical assessment scores
      let physUpdated = 0;
      const physUpdates = [];
      for (const a of assessments) {
        const gender = playerGenderMap.get(a.player_id) || "all";
        const changes = {};
        for (const testDef of [
          { key: "speed", raw: "sprint_20m_seconds" },
          { key: "power", raw: "vertical_jump_inches" },
          { key: "agility", raw: "agility_5_10_5_seconds" },
          { key: "endurance", raw: "yoyo_level" },
        ]) {
          const rawVal = a[testDef.raw];
          if (rawVal == null) continue;
          const b =
            physBenchmarks.find((x) => x.test_key === testDef.key && x.gender === gender) ||
            physBenchmarks.find((x) => x.test_key === testDef.key && x.gender === "all");
          if (b) {
            const newScore = scoreFromBenchmark(rawVal, b);
            if (newScore != null && newScore !== a[testDef.key]) {
              changes[testDef.key] = newScore;
            }
          }
        }
        // Recompute overall
        const speed = changes.speed ?? a.speed;
        const power = changes.power ?? a.power;
        const agility = changes.agility ?? a.agility;
        const endurance = changes.endurance ?? a.endurance;
        const subs = [speed, power, agility, endurance].filter((v) => v != null);
        if (subs.length === 4) {
          const newOverall = Math.round(subs.reduce((s, v) => s + v, 0) / 4);
          if (newOverall !== a.overall) changes.overall = newOverall;
        }
        if (Object.keys(changes).length > 0) {
          physUpdates.push({ id: a.id, ...changes });
          physUpdated++;
        }
      }
      // BulkUpdate in batches of 400
      for (let i = 0; i < physUpdates.length; i += 400) {
        await base44.entities.PhysicalAssessment.bulkUpdate(physUpdates.slice(i, i + 400));
      }

      // 4. Recompute skill test score levels
      const scores = await base44.entities.SkillTestScore.list("-created_date", 5000);
      let skillUpdated = 0;
      const skillUpdates = [];
      for (const s of scores) {
        const b = skillBenchmarks.find((x) => x.test_key === s.test_id);
        if (!b) continue;
        const pct = scoreFromBenchmark(s.score, b);
        if (pct == null) continue;
        const newLevel = pct >= 85 ? "expert" : pct >= 70 ? "advanced" : pct >= 50 ? "intermediate" : "beginner";
        if (newLevel !== s.level) {
          skillUpdates.push({ id: s.id, level: newLevel });
          skillUpdated++;
        }
      }
      for (let i = 0; i < skillUpdates.length; i += 400) {
        await base44.entities.SkillTestScore.bulkUpdate(skillUpdates.slice(i, i + 400));
      }

      setResult({ physUpdated, skillUpdated });
      toast.success(`Recalculated ${physUpdated} physical scores and ${skillUpdated} skill levels`);
      qc.invalidateQueries({ queryKey: ["coe-physical"] });
      qc.invalidateQueries({ queryKey: ["coe-scores"] });
      qc.invalidateQueries({ queryKey: ["player-physical"] });
      qc.invalidateQueries({ queryKey: ["player-skill-scores"] });
    } catch (e) {
      console.error(e);
      toast.error("Failed to recalculate scores");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleRecalculate} disabled={processing} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        {processing ? "Recalculating..." : "Push Results to Scores"}
      </Button>
      {result && !processing && (
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {result.physUpdated} physical · {result.skillUpdated} skill updated
        </span>
      )}
    </div>
  );
}