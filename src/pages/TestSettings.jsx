import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdisalPageHeader, AdisalCard, SectionLabel } from "@/components/adisal/ui";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Save, TrendingUp, TrendingDown, Activity, Target, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { PHYSICAL_TEST_DEFS } from "@/lib/testScoring";
import { isMasterAdmin } from "@/lib/rbac";

const GENDERS = [
  { key: "all", label: "All Players" },
  { key: "male", label: "Boys" },
  { key: "female", label: "Girls" },
];

function BenchmarkEditor({ benchmark, onSave, testLabel, unit, direction, category, testKey, gender }) {
  const [vals, setVals] = useState({ p20: "", p40: "", p60: "", p80: "", p100: "" });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiNotes, setAiNotes] = useState("");
  const [coefficient, setCoefficient] = useState(1);

  useEffect(() => {
    setVals({
      p20: benchmark?.p20 ?? "",
      p40: benchmark?.p40 ?? "",
      p60: benchmark?.p60 ?? "",
      p80: benchmark?.p80 ?? "",
      p100: benchmark?.p100 ?? "",
    });
    setAiNotes(benchmark?.ai_formula_notes || "");
    setCoefficient(benchmark?.coefficient ?? 1);
  }, [benchmark]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...benchmark,
        category,
        test_key: testKey,
        test_label: testLabel,
        unit,
        direction,
        gender: gender || "all",
        p20: vals.p20 ? Number(vals.p20) : null,
        p40: vals.p40 ? Number(vals.p40) : null,
        p60: vals.p60 ? Number(vals.p60) : null,
        p80: vals.p80 ? Number(vals.p80) : null,
        p100: vals.p100 ? Number(vals.p100) : null,
        ai_formula_notes: aiNotes,
        coefficient: Number(coefficient) || 1,
        updated_by: "admin@jaguars.com",
      };
      if (benchmark?.id) {
        await base44.entities.TestBenchmark.update(benchmark.id, payload);
      } else {
        await base44.entities.TestBenchmark.create(payload);
      }
      toast.success(`${testLabel} benchmark saved`);
      onSave?.();
    } catch {
      toast.error("Failed to save benchmark");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    const filled = Object.values(vals).filter((v) => v !== "").length;
    if (filled < 5) {
      toast.error("Fill all 5 benchmark values before generating the formula");
      return;
    }
    setGenerating(true);
    try {
      const prompt = `You are a sports science expert. Write a concise, coach-friendly description of the scoring formula for the "${testLabel}" test.
The test is measured in ${unit}. ${direction === "lower_better" ? "Lower raw values are better." : "Higher raw values are better."}
Benchmark points (raw value → score percentage):
- 20% = ${vals.p20} ${unit}
- 40% = ${vals.p40} ${unit}
- 60% = ${vals.p60} ${unit}
- 80% = ${vals.p80} ${unit}
- 100% = ${vals.p100} ${unit}

Write 2-3 sentences explaining how a player's raw result converts to a 0-100 percentage score using these benchmarks. Mention interpolation between points and clamping at 0 and 100. Be clear and practical.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt, model: "gpt_5_mini" });
      setAiNotes(typeof res === "string" ? res : res?.text || "");
      toast.success("Formula generated");
    } catch {
      toast.error("AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const TrendIcon = direction === "lower_better" ? TrendingDown : TrendingUp;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <TrendIcon className={`w-4 h-4 ${direction === "lower_better" ? "text-rose-500" : "text-emerald-500"}`} />
        <span className="text-xs font-semibold text-muted-foreground">
          {direction === "lower_better" ? "Lower is better" : "Higher is better"} · {unit}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {["p20", "p40", "p60", "p80", "p100"].map((k) => (
          <div key={k}>
            <label className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-1 block">{k.replace("p", "")}%</label>
            <Input
              type="number"
              step="0.01"
              value={vals[k]}
              onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))}
              placeholder="—"
              className="text-sm"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase whitespace-nowrap">Coefficient</label>
        <Input
          type="number"
          step="0.1"
          min="0"
          value={coefficient}
          onChange={(e) => setCoefficient(e.target.value)}
          className="w-20 text-sm"
        />
        <span className="text-[10px] text-muted-foreground">Weight in overall score (default 1.0 · higher = more impact)</span>
      </div>
      {aiNotes && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-bold text-primary tracking-wider uppercase">AI Formula</span>
          </div>
          <p className="text-xs text-foreground whitespace-pre-wrap">{aiNotes}</p>
        </div>
      )}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} size="sm" className="bg-primary hover:bg-primary/90">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Save Benchmark
        </Button>
        <Button onClick={handleGenerate} disabled={generating} variant="outline" size="sm">
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />}
          AI Generate Formula
        </Button>
      </div>
    </div>
  );
}

export default function TestSettings() {
  const qc = useQueryClient();
  const [gender, setGender] = useState("all");
  const [tab, setTab] = useState("physical");

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["current-user-test-settings"],
    queryFn: () => base44.auth.me().catch(() => null),
  });

  const { data: benchmarks = [], isLoading } = useQuery({
    queryKey: ["test-benchmarks"],
    queryFn: () => base44.entities.TestBenchmark.list("-created_date", 500),
  });

  const { data: skillTests = [] } = useQuery({
    queryKey: ["skill-tests-for-benchmarks"],
    queryFn: () => base44.entities.SkillTest.list("order", 50),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["test-benchmarks"] });

  if (userLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  }

  if (!isMasterAdmin(currentUser)) {
    return (
      <div className="p-6 lg:p-8 max-w-md mx-auto text-center py-24">
        <ShieldAlert className="w-10 h-10 text-muted-foreground/50 mx-auto mb-4" />
        <h1 className="text-lg font-bold text-foreground mb-1">Master Admin Access Only</h1>
        <p className="text-sm text-muted-foreground">Test benchmark settings can only be viewed or changed by a Master Admin.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <AdisalPageHeader
        breadcrumb="Player Development"
        title="TEST"
        titleAccent="SETTINGS"
        subtitle="Define the 20/40/60/80/100 benchmark values for each physical and skill test. The AI formula generator converts your values into a scoring description that coaches can understand."
        actions={
          <Badge variant="outline" className="text-xs">
            {benchmarks.length} benchmark{benchmarks.length !== 1 ? "s" : ""} configured
          </Badge>
        }
      />

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("physical")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${tab === "physical" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}
        >
          <Activity className="w-4 h-4" /> Physical Tests
        </button>
        <button
          onClick={() => setTab("skill")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${tab === "skill" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"}`}
        >
          <Target className="w-4 h-4" /> Skill Tests
        </button>
      </div>

      {tab === "physical" && (
        <>
          {/* Gender selector for physical tests */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold text-muted-foreground">Benchmark scale for:</span>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="w-40 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => <SelectItem key={g.key} value={g.key}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {PHYSICAL_TEST_DEFS.map((def) => {
              const benchmark = benchmarks.find((b) => b.category === "physical" && b.test_key === def.key && b.gender === gender);
              return (
                <AdisalCard key={def.key} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <SectionLabel>{def.metricLabel}</SectionLabel>
                      <p className="text-sm font-bold text-foreground mt-0.5">{def.label}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{def.unit}</Badge>
                  </div>
                  <BenchmarkEditor
                    benchmark={benchmark}
                    category="physical"
                    testKey={def.key}
                    gender={gender}
                    testLabel={def.metricLabel}
                    unit={def.unit}
                    direction={def.direction}
                    onSave={refresh}
                  />
                </AdisalCard>
              );
            })}
          </div>
        </>
      )}

      {tab === "skill" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {skillTests.length === 0 ? (
            <AdisalCard className="p-8 lg:col-span-2 text-center">
              <p className="text-sm text-muted-foreground">No skill tests defined yet. Create skill tests first to configure their benchmarks.</p>
            </AdisalCard>
          ) : skillTests.map((st) => {
            const benchmark = benchmarks.find((b) => b.category === "skill" && b.test_key === st.id);
            return (
              <AdisalCard key={st.id} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <SectionLabel>{st.category === "advanced" ? "Advanced" : "Basic"} Skill Test</SectionLabel>
                    <p className="text-sm font-bold text-foreground mt-0.5">{st.title}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">points</Badge>
                </div>
                <BenchmarkEditor
                  benchmark={benchmark}
                  category="skill"
                  testKey={st.id}
                  gender="all"
                  testLabel={st.title}
                  unit="points"
                  direction="higher_better"
                  onSave={refresh}
                />
              </AdisalCard>
            );
          })}
        </div>
      )}
    </div>
  );
}