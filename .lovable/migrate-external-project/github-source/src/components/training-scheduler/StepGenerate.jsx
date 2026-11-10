import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wand2, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { minToLabel } from "@/lib/trainingSchedulerConfig";

export default function StepGenerate({ clubId, config, scenarios, setScenarios, activeScenario, setActiveScenario, onPrev, onNext }) {
  const [generating, setGenerating] = useState(false);
  const [scenarioName, setScenarioName] = useState(`Scenario ${new Date().toLocaleDateString()}`);
  const [error, setError] = useState(null);
  const qc = useQueryClient();

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("generate-training-schedule", {
        club_id: clubId,
        config,
        scenario_name: scenarioName,
        season: config.season_start,
        locked_sessions: (activeScenario?.sessions || []).filter((s) => s.locked),
      });
      const scenario = res.data.scenario;
      setActiveScenario(scenario);
      setScenarios([scenario, ...scenarios.filter((s) => s.id !== scenario?.id)]);
      qc.invalidateQueries({ queryKey: ["scheduleScenarios", clubId] });
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async (scenarioId) => {
    setGenerating(true);
    setError(null);
    try {
      const locked = (activeScenario?.sessions || []).filter((s) => s.locked);
      const res = await base44.functions.invoke("generate-training-schedule", {
        club_id: clubId,
        scenario_id: scenarioId,
        config,
        locked_sessions: locked,
      });
      setActiveScenario(res.data.scenario);
      setScenarios((prev) => prev.map((s) => (s.id === scenarioId ? res.data.scenario : s)));
    } catch (e) {
      setError(e?.response?.data?.error || e?.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" /> Generate Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Scenario Name</Label>
            <Input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} placeholder="e.g. Fall 2026 Draft A" />
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Algorithm Passes</p>
            <ol className="space-y-1.5 text-sm text-foreground">
              <li><Badge className="mr-2 bg-primary/10 text-primary">1</Badge> Reserve premium blocks by platform priority</li>
              <li><Badge className="mr-2 bg-primary/10 text-primary">2</Badge> Place remaining teams most-constrained first</li>
              <li><Badge className="mr-2 bg-primary/10 text-primary">3</Badge> Improve by swaps/moves (never worsen higher-priority)</li>
              <li><Badge className="mr-2 bg-primary/10 text-primary">4</Badge> Pack teams into grids</li>
            </ol>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button onClick={handleGenerate} disabled={generating} className="w-full gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {generating ? "Generating..." : "Generate Schedule"}
          </Button>
        </CardContent>
      </Card>

      {scenarios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Saved Scenarios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {scenarios.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${activeScenario?.id === s.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/20"}`}
                onClick={() => setActiveScenario(s)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.scorecard?.placed_count || 0}/{s.scorecard?.total_sessions || 0} sessions · {s.scorecard?.percent_placed || 0}% placed
                  </p>
                </div>
                <Badge variant={s.status === "published" ? "default" : "outline"}>{s.status}</Badge>
                {activeScenario?.id === s.id && (
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleRegenerate(s.id); }} disabled={generating}>
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeScenario && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <p className="text-sm text-emerald-800 flex-1">
            <strong>{activeScenario.name}</strong>: {activeScenario.scorecard?.placed_count}/{activeScenario.scorecard?.total_sessions} sessions placed ({activeScenario.scorecard?.percent_placed}%).
          </p>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}><ArrowLeft className="w-4 h-4" /> Back</Button>
        <Button onClick={onNext} disabled={!activeScenario}>Continue to Review <ArrowRight className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}