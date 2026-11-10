import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, Trophy, Users, Crown, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { computeTechnicalScore, scoreFromBenchmark } from "@/lib/testScoring";
import RadialScoreChart from "./RadialScoreChart";

const CHART_COLORS = ["#6366f1", "#22C55E", "#EF4444", "#3B82F6", "#EC4899", "#F59E0B", "#8B5CF6", "#14B8A6"];

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    amber: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
  };
  return (
    <div className={`p-3 rounded-lg border ${colors[color]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-extrabold">{value ?? "—"}</p>
    </div>
  );
}

export default function SkillTestHistory({ playerId, benchmarks, scores, compact = false }) {
  const { data: allScores = [] } = useQuery({
    queryKey: ["player-skill-scores", playerId],
    queryFn: () => base44.entities.SkillTestScore.filter({ player_id: playerId }, "-test_date", 200),
    enabled: !scores && !!playerId
  });
  const data = scores || allScores;

  const { data: fetchedBenchmarks = [] } = useQuery({
    queryKey: ["skill-benchmarks"],
    queryFn: () => base44.entities.TestBenchmark.filter({ category: "skill" }),
    enabled: !benchmarks && !!playerId
  });
  const allBenchmarks = benchmarks || fetchedBenchmarks;

  const { data: player } = useQuery({
    queryKey: ["player-detail", playerId],
    queryFn: () => base44.entities.Player.get(playerId),
    enabled: !!playerId
  });

  const { data: clubTeams = [] } = useQuery({
    queryKey: ["club-teams-comparison"],
    queryFn: () => base44.entities.Team.list("-created_date", 200),
    enabled: !!playerId && !compact
  });

  const { data: clubScores = [] } = useQuery({
    queryKey: ["club-skill-scores-comparison"],
    queryFn: () => base44.entities.SkillTestScore.list("-test_date", 5000),
    enabled: !!playerId && !compact,
    staleTime: 120000
  });

  // Group scores by test_date (sessions) — sorted descending (latest first)
  const sessions = useMemo(() => {
    const map = new Map();
    data.forEach(s => {
      const date = s.test_date;
      if (!map.has(date)) map.set(date, []);
      map.get(date).push(s);
    });
    return Array.from(map.entries()).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([date, sessionScores]) => ({ date, scores: sessionScores }));
  }, [data]);

  const [sessionIdx, setSessionIdx] = useState(0);
  const currentSession = sessions[sessionIdx];

  const technicalPct = useMemo(() => computeTechnicalScore(data, allBenchmarks), [data, allBenchmarks]);

  // Comparison data (raw values, not percentages)
  const comparison = useMemo(() => {
    if (compact || !player || !clubTeams.length || !clubScores.length) return null;

    const playerTeam = clubTeams.find(t => t.id === player.team_id);
    const teamGender = playerTeam?.gender || player.gender;
    const teamPlayerIds = playerTeam?.player_ids || [];
    const sameGenderTeams = clubTeams.filter(t => t.gender === teamGender);
    const clubPlayerIds = [...new Set(sameGenderTeams.flatMap(t => t.player_ids || []))];

    const byPlayer = new Map();
    [...clubScores].sort((a, b) => new Date(a.test_date) - new Date(b.test_date)).forEach(s => {
      if (!byPlayer.has(s.player_id)) byPlayer.set(s.player_id, new Map());
      byPlayer.get(s.player_id).set(s.test_id, s);
    });

    const testIds = [...new Set(data.map(s => s.test_id))];
    const testTitles = {};
    data.forEach(s => { testTitles[s.test_id] = s.test_title; });

    const perTest = testIds.map(testId => {
      const playerScore = byPlayer.get(playerId)?.get(testId);
      const playerRaw = playerScore?.score ?? null;

      const teamRaws = teamPlayerIds.map(pid => byPlayer.get(pid)?.get(testId)?.score).filter(v => v != null);
      const clubRaws = clubPlayerIds.map(pid => byPlayer.get(pid)?.get(testId)?.score).filter(v => v != null);

      return {
        testId, title: testTitles[testId], player: playerRaw,
        teamBest: teamRaws.length ? Math.max(...teamRaws) : null,
        teamAvg: teamRaws.length ? (teamRaws.reduce((a, c) => a + c, 0) / teamRaws.length).toFixed(1) : null,
        clubBest: clubRaws.length ? Math.max(...clubRaws) : null,
        clubAvg: clubRaws.length ? (clubRaws.reduce((a, c) => a + c, 0) / clubRaws.length).toFixed(1) : null
      };
    });

    const teamBests = perTest.map(t => t.teamBest).filter(v => v != null);
    const teamAvgs = perTest.map(t => parseFloat(t.teamAvg)).filter(v => v != null);
    const clubBests = perTest.map(t => t.clubBest).filter(v => v != null);
    const clubAvgs = perTest.map(t => parseFloat(t.clubAvg)).filter(v => v != null);

    return {
      perTest,
      overall: {
        teamBest: teamBests.length ? (teamBests.reduce((a, b) => a + b, 0) / teamBests.length).toFixed(1) : null,
        teamAvg: teamAvgs.length ? (teamAvgs.reduce((a, b) => a + b, 0) / teamAvgs.length).toFixed(1) : null,
        clubBest: clubBests.length ? (clubBests.reduce((a, b) => a + b, 0) / clubBests.length).toFixed(1) : null,
        clubAvg: clubAvgs.length ? (clubAvgs.reduce((a, b) => a + b, 0) / clubAvgs.length).toFixed(1) : null
      }
    };
  }, [data, player, clubTeams, clubScores, allBenchmarks, compact]);

  const comparisonByTest = useMemo(() => {
    if (!comparison) return {};
    const map = {};
    comparison.perTest.forEach(t => { map[t.testId] = t; });
    return map;
  }, [comparison]);

  // Radial data for current session
  const radialData = useMemo(() => {
    if (!currentSession) return [];
    return currentSession.scores.map((s, i) => {
      const b = allBenchmarks?.find(x => x.category === "skill" && x.test_key === s.test_id);
      const pct = b ? scoreFromBenchmark(s.score, b) : 0;
      return {
        name: s.test_title?.length > 15 ? s.test_title.substring(0, 13) + "…" : s.test_title,
        value: pct || 0,
        color: CHART_COLORS[i % CHART_COLORS.length]
      };
    });
  }, [currentSession, allBenchmarks]);

  if (!data.length) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground mb-3">No skill test scores recorded yet.</p>
        <Link to={createPageUrl("TestDayManager")}>
          <Button size="sm" className="bg-primary hover:bg-primary/90"><Plus className="w-3.5 h-3.5 mr-1.5" /> Log Skill Test</Button>
        </Link>
      </div>
    );
  }

  const sessionTechnicalPct = currentSession ? computeTechnicalScore(currentSession.scores, allBenchmarks) : null;

  return (
    <div className="space-y-4">
      {/* Overall technical score */}
      <div className="flex items-center gap-4 p-3 surface-tile rounded-lg">
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Technical Score</p>
          <p className="text-2xl font-extrabold text-primary">{technicalPct ?? "—"}<span className="text-sm text-muted-foreground">%</span></p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">{sessions.length} test session{sessions.length !== 1 ? "s" : ""} on file</p>
          <Progress value={technicalPct || 0} className="h-2" />
        </div>
      </div>

      {/* Carousel: one test session at a time */}
      {currentSession && (
        <div className="surface-tile rounded-lg p-4">
          {/* Carousel header with arrows */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSessionIdx(i => Math.min(i + 1, sessions.length - 1))}
                disabled={sessionIdx >= sessions.length - 1}
                className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous session"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center min-w-[160px]">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Test Session</p>
                <p className="text-sm font-semibold">{currentSession.date ? format(new Date(currentSession.date), "MMM d, yyyy") : "—"}</p>
              </div>
              <button
                onClick={() => setSessionIdx(i => Math.max(i - 1, 0))}
                disabled={sessionIdx <= 0}
                className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next session"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <span className="text-[10px] text-muted-foreground">{sessionIdx + 1} of {sessions.length}</span>
          </div>

          {/* Session technical score */}
          <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Session Score:</p>
            <p className="text-lg font-bold text-primary">{sessionTechnicalPct ?? "—"}<span className="text-xs text-muted-foreground">%</span></p>
            <span className="text-[10px] text-muted-foreground ml-auto">{currentSession.scores.length} test{currentSession.scores.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Radial chart for this session */}
          {radialData.length > 0 && (
            <RadialScoreChart data={radialData} centerLabel="Session" centerValue={`${sessionTechnicalPct ?? "—"}%`} />
          )}

          {/* Per-test scores for this session */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {currentSession.scores.map((s, i) => {
              const b = allBenchmarks?.find(x => x.category === "skill" && x.test_key === s.test_id);
              const pct = b ? scoreFromBenchmark(s.score, b) : null;
              const cmp = comparisonByTest[s.test_id];
              return (
                <div key={s.id || i} className="surface-tile p-3 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold truncate flex-1">{s.test_title}</p>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div>
                      <span className="text-lg font-bold">{s.score}</span>
                      {pct != null && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-primary/10 text-xs font-bold text-primary">{pct}%</span>}
                    </div>
                  </div>
                  {/* Team & Club comparison badges — raw values */}
                  {cmp && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border">
                      {cmp.teamBest != null && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold">Team Best {cmp.teamBest}</span>}
                      {cmp.teamAvg != null && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-500">Team Avg {cmp.teamAvg}</span>}
                      {cmp.clubBest != null && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold">Club Best {cmp.clubBest}</span>}
                      {cmp.clubAvg != null && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-500">Club Avg {cmp.clubAvg}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison stat cards — raw values */}
      {comparison && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatCard icon={Trophy} label="Team Best" value={comparison.overall.teamBest} color="emerald" />
          <StatCard icon={Users} label="Team Avg" value={comparison.overall.teamAvg} color="emerald" />
          <StatCard icon={Crown} label="Club Best" value={comparison.overall.clubBest} color="amber" />
          <StatCard icon={Building2} label="Club Avg" value={comparison.overall.clubAvg} color="amber" />
        </div>
      )}
    </div>
  );
}