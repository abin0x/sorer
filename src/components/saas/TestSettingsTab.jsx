import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Save, TrendingUp, TrendingDown, Activity, Target, Building2, Copy, X } from "lucide-react";
import { toast } from "sonner";
import { PHYSICAL_TEST_DEFS } from "@/lib/testScoring";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const GENDERS = [
  { key: "all", label: "All Players" },
  { key: "male", label: "Boys" },
  { key: "female", label: "Girls" },
];

function BenchmarkEditor({ benchmark, onSave, testLabel, unit, direction: dirProp, category, testKey, gender, clubId, editableDirection }) {
  const [vals, setVals] = useState({ p20: "", p40: "", p60: "", p80: "", p100: "" });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiNotes, setAiNotes] = useState("");
  const [coefficient, setCoefficient] = useState(1);
  const [direction, setDirection] = useState(dirProp);

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
    setDirection(benchmark?.direction || dirProp);
  }, [benchmark, dirProp]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        category,
        test_key: testKey,
        test_label: testLabel,
        unit,
        direction,
        gender: gender || "all",
        club_id: clubId,
        p20: vals.p20 ? Number(vals.p20) : null,
        p40: vals.p40 ? Number(vals.p40) : null,
        p60: vals.p60 ? Number(vals.p60) : null,
        p80: vals.p80 ? Number(vals.p80) : null,
        p100: vals.p100 ? Number(vals.p100) : null,
        ai_formula_notes: aiNotes,
        coefficient: Number(coefficient) || 1,
        updated_by: "system-admin",
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
Write 2-3 sentences explaining how a player's raw result converts to a 0-100 percentage score using these benchmarks.`;
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
        {editableDirection && (
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => setDirection("higher_better")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${direction === "higher_better" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}
            >
              <TrendingUp className="w-3 h-3 inline mr-0.5" />Higher
            </button>
            <button
              type="button"
              onClick={() => setDirection("lower_better")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${direction === "lower_better" ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground"}`}
            >
              <TrendingDown className="w-3 h-3 inline mr-0.5" />Lower
            </button>
          </div>
        )}
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
        <span className="text-[10px] text-muted-foreground">Weight in overall score (default 1.0)</span>
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

export default function TestSettingsTab({ selectedClubId, clubs }) {
  const qc = useQueryClient();
  const [gender, setGender] = useState("all");
  const [tab, setTab] = useState("physical");
  const [copyOpen, setCopyOpen] = useState(false);
  const [targetClubIds, setTargetClubIds] = useState([]);
  const [copying, setCopying] = useState(false);

  // Fetch benchmarks for the selected club — pass club_id explicitly to bypass scoping
  const { data: benchmarks = [], isLoading } = useQuery({
    queryKey: ["test-benchmarks", selectedClubId],
    queryFn: () => base44.entities.TestBenchmark.filter({ club_id: selectedClubId }, "-created_date", 500),
    enabled: !!selectedClubId,
  });

  const { data: skillTests = [] } = useQuery({
    queryKey: ["skill-tests-for-benchmarks"],
    queryFn: () => base44.entities.SkillTest.list("order", 50),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["test-benchmarks", selectedClubId] });

  const handleCopy = async () => {
    if (targetClubIds.length === 0) { toast.error("Select at least one target club"); return; }
    setCopying(true);
    try {
      let created = 0;
      for (const targetId of targetClubIds) {
        for (const b of benchmarks) {
          await base44.entities.TestBenchmark.create({
            category: b.category,
            test_key: b.test_key,
            test_label: b.test_label,
            unit: b.unit,
            direction: b.direction,
            gender: b.gender || "all",
            club_id: targetId,
            p20: b.p20, p40: b.p40, p60: b.p60, p80: b.p80, p100: b.p100,
            ai_formula_notes: b.ai_formula_notes,
            coefficient: b.coefficient || 1,
            updated_by: "system-admin",
          });
          created++;
        }
      }
      toast.success(`Copied ${created} benchmark${created !== 1 ? "s" : ""} to ${targetClubIds.length} club${targetClubIds.length !== 1 ? "s" : ""}`);
      setCopyOpen(false);
      setTargetClubIds([]);
    } catch {
      toast.error("Failed to copy benchmarks");
    } finally {
      setCopying(false);
    }
  };

  if (!selectedClubId) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>Select a tenant above to manage its test benchmarks.</p>
      </div>
    );
  }

  const selectedClub = clubs.find((c) => c.id === selectedClubId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Test Settings
          </h2>
          <p className="text-sm text-muted-foreground">
            Managing benchmarks for <span className="font-semibold">{selectedClub?.name || "selected club"}</span>
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {benchmarks.length} benchmark{benchmarks.length !== 1 ? "s" : ""} configured
        </Badge>
        {benchmarks.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setCopyOpen(true)} className="ml-auto">
            <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy to Clubs
          </Button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
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

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : tab === "physical" ? (
        <>
          <div className="flex items-center gap-3">
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
                <div key={def.key} className="p-5 rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{def.metricLabel}</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{def.label}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{def.unit}</Badge>
                  </div>
                  <BenchmarkEditor
                    benchmark={benchmark}
                    category="physical"
                    testKey={def.key}
                    gender={gender}
                    clubId={selectedClubId}
                    testLabel={def.metricLabel}
                    unit={def.unit}
                    direction={def.direction}
                    onSave={refresh}
                  />
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {skillTests.length === 0 ? (
            <div className="p-8 lg:col-span-2 text-center text-muted-foreground">
              No skill tests defined yet. Create skill tests first to configure their benchmarks.
            </div>
          ) : skillTests.map((st) => {
            const benchmark = benchmarks.find((b) => b.category === "skill" && b.test_key === st.id);
            return (
              <div key={st.id} className="p-5 rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{st.category === "advanced" ? "Advanced" : "Basic"} Skill Test</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{st.title}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">points</Badge>
                </div>
                <BenchmarkEditor
                  benchmark={benchmark}
                  category="skill"
                  testKey={st.id}
                  gender="all"
                  clubId={selectedClubId}
                  testLabel={st.title}
                  unit={benchmark?.unit || "points"}
                  direction={benchmark?.direction || "higher_better"}
                  editableDirection
                  onSave={refresh}
                />
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Copy className="w-4 h-4" /> Copy Benchmarks to Clubs</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Copy all {benchmarks.length} benchmark{benchmarks.length !== 1 ? "s" : ""} from <strong>{selectedClub?.name}</strong> to the selected clubs. This will add new benchmark records (existing ones are not overwritten).
          </p>
          <div className="max-h-60 overflow-y-auto space-y-2 border border-border rounded-lg p-3">
            {clubs.filter((c) => c.id !== selectedClubId).map((c) => (
              <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded p-1.5">
                <Checkbox
                  checked={targetClubIds.includes(c.id)}
                  onCheckedChange={(v) => {
                    if (v) setTargetClubIds((s) => [...s, c.id]);
                    else setTargetClubIds((s) => s.filter((id) => id !== c.id));
                  }}
                />
                <span className="text-sm font-medium">{c.name}</span>
                {c.slug && <span className="text-xs text-muted-foreground">· {c.slug}</span>}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setCopyOpen(false); setTargetClubIds([]); }}>Cancel</Button>
            <Button onClick={handleCopy} disabled={copying || targetClubIds.length === 0} className="bg-primary hover:bg-primary/90">
              {copying ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              Copy to {targetClubIds.length} club{targetClubIds.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}