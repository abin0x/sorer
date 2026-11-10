import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Award, ChevronRight, Loader2, Plus, Timer, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import NativeSheet from "@/components/beacon/NativeSheet";
import TestDiagram from "@/components/player/TestDiagrams";
import { haptic } from "@/lib/haptics";
import { computePhysicalScore, computePhysicalSubScores, computeTechnicalScore, ratingLabel10, scoreFromBenchmark } from "@/lib/testScoring";
import { developmentGender, latestSkillScores, PHYSICAL_FIELDS, physicalAssessmentValues, skillResultValues } from "@/lib/beaconDevelopment";

const asList = (value) => Array.isArray(value) ? value : [];
const playerName = (player) => `${player?.first_name || ""} ${player?.last_name || ""}`.trim() || "Player";
const day = (value) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
const today = () => new Date().toISOString().slice(0, 10);

function Panel({ children, className = "" }) {
  return <div className={`rounded-2xl border border-border bg-card p-4 shadow-sm ${className}`}>{children}</div>;
}

function Empty({ children }) {
  return <Panel className="py-8 text-center text-sm text-muted-foreground">{children}</Panel>;
}

function QueryError({ retry }) {
  return <Panel className="text-center py-6"><p className="text-sm font-medium">These results couldn’t be loaded.</p><button onClick={retry} className="mt-3 min-h-[44px] rounded-xl border border-border px-4 text-sm font-semibold">Try again</button></Panel>;
}

export default function BeaconPlayerTesting({ mode, player, staff, user, scope, edit, setEdit, onSaved }) {
  const skills = mode === "skills";
  const testsQ = useQuery({
    queryKey: ["beacon-dev-tests", scope.club_id],
    queryFn: () => base44.entities.SkillTest.filter({ club_id: scope.club_id }, "order", 100),
    enabled: skills && !!scope.club_id,
  });
  const scoresQ = useQuery({
    queryKey: ["beacon-dev-skills", player.id],
    queryFn: () => base44.entities.SkillTestScore.filter(scope, "-test_date", 300),
    enabled: skills && !!player.id,
  });
  const physicalQ = useQuery({
    queryKey: ["beacon-dev-physical", player.id],
    queryFn: () => base44.entities.PhysicalAssessment.filter(scope, "-assessment_date", 100),
    enabled: !skills && !!player.id,
  });
  const benchmarksQ = useQuery({
    queryKey: ["beacon-dev-benchmarks", scope.club_id],
    queryFn: () => base44.entities.TestBenchmark.filter({ club_id: scope.club_id }, "-created_date", 500),
    enabled: !!scope.club_id,
  });

  const close = () => setEdit(null);
  const saved = () => { onSaved(); testsQ.refetch(); scoresQ.refetch(); physicalQ.refetch(); };
  if (skills) {
    if (testsQ.isLoading || scoresQ.isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">Loading skill tests…</p>;
    if (testsQ.isError || scoresQ.isError) return <QueryError retry={() => { testsQ.refetch(); scoresQ.refetch(); }} />;
    return <>
      <SkillsHistory tests={asList(testsQ.data)} scores={asList(scoresQ.data)} benchmarks={asList(benchmarksQ.data)} staff={staff} onLog={(test) => setEdit({ kind: "skills", test })} />
      {edit?.kind === "skills" && <SkillEntrySheet tests={asList(testsQ.data)} initialTest={edit.test} player={player} user={user} scope={scope} onClose={close} onSaved={saved} />}
    </>;
  }
  if (physicalQ.isLoading || benchmarksQ.isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">Loading physical assessments…</p>;
  if (physicalQ.isError || benchmarksQ.isError) return <QueryError retry={() => { physicalQ.refetch(); benchmarksQ.refetch(); }} />;
  return <>
    <PhysicalHistory assessments={asList(physicalQ.data)} benchmarks={asList(benchmarksQ.data)} player={player} />
    {edit?.kind === "physical" && <PhysicalEntrySheet player={player} user={user} scope={scope} benchmarks={asList(benchmarksQ.data)} onClose={close} onSaved={saved} />}
  </>;
}

function SkillsHistory({ tests, scores, benchmarks, staff, onLog }) {
  const [category, setCategory] = useState("basic");
  const [detail, setDetail] = useState(null);
  const latest = useMemo(() => latestSkillScores(scores), [scores]);
  const technical = computeTechnicalScore(scores, benchmarks);
  const visible = tests.filter((test) => (test.category || "basic") === category).sort((a, b) => (a.order || 0) - (b.order || 0));
  const categories = ["basic", "advanced"];
  return <>
    <Panel className="mb-3 flex items-center gap-4 bg-primary text-primary-foreground border-primary">
      <div><div className="text-[11px] font-bold uppercase tracking-wider opacity-80">Technical index</div><div className="text-4xl font-black tabular-nums">{technical ?? "—"}<span className="text-sm opacity-70">{technical != null ? "/100" : ""}</span></div></div>
      <div className="flex-1 text-xs opacity-85">Latest result from every completed test, scored against club benchmarks.</div>
      <Award className="w-8 h-8 opacity-70" />
    </Panel>
    <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1 mb-3">
      {categories.map((item) => <button key={item} onClick={() => { haptic(); setCategory(item); }} className={`min-h-[44px] rounded-lg text-sm font-bold capitalize ${category === item ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>{item}<span className="ml-1 text-xs opacity-70">{tests.filter((test) => test.category === item).length}</span></button>)}
    </div>
    {!visible.length ? <Empty>No {category} tests are configured for this club.</Empty> : <div className="space-y-2">{visible.map((test) => {
      const score = latest.get(test.id);
      const benchmark = benchmarks.find((b) => b.category === "skill" && b.test_key === test.id);
      const pct = score && benchmark ? scoreFromBenchmark(score.score, benchmark) : null;
      return <Panel key={test.id} className="p-0 overflow-hidden">
        <button onClick={() => { haptic(); setDetail(test); }} className="w-full min-h-[76px] p-4 text-left flex items-center gap-3 active:bg-muted/50">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0"><TrendingUp className="w-5 h-5" /></div>
          <div className="min-w-0 flex-1"><div className="font-bold leading-tight">{test.title}</div><div className="text-xs text-muted-foreground mt-1">{score ? `Latest ${score.score} · ${day(score.test_date)}` : "No result yet"}{test.duration_minutes ? ` · ${test.duration_minutes} min` : ""}</div></div>
          <div className="text-right shrink-0">{pct != null && <div className="font-black text-primary">{pct}%</div>}<div className="text-[10px] font-semibold text-muted-foreground">{pct != null ? ratingLabel10(pct / 10) : "View drill"}</div></div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
        {staff && <button onClick={() => { haptic(); onLog(test); }} className="w-full min-h-[44px] border-t border-border text-sm font-bold text-primary flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" />Log {test.title}</button>}
      </Panel>;
    })}</div>}
    <NativeSheet open={!!detail} onClose={() => setDetail(null)} title={detail?.title || "Skill test"}>
      {detail && <SkillDetail test={detail} scores={scores.filter((score) => score.test_id === detail.id)} staff={staff} onLog={() => { const test = detail; setDetail(null); onLog(test); }} />}
    </NativeSheet>
  </>;
}

function SkillDetail({ test, scores, staff, onLog }) {
  return <>
    <div className="aspect-square max-h-[310px] w-full rounded-2xl bg-muted/30 border border-border p-4"><TestDiagram testTitle={test.title} /></div>
    {test.description && <p className="text-sm text-muted-foreground mt-3">{test.description}</p>}
    {[["Setup", test.setup], ["How to perform", test.how_to_perform], ["Scoring", test.scoring], ["Diagram notes", test.diagram_notes]].map(([label, value]) => value ? <section key={label} className="mt-4"><h3 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{label}</h3><p className="text-sm mt-1 whitespace-pre-line">{value}</p></section> : null)}
    {staff && <button onClick={onLog} className="mt-4 w-full min-h-[48px] rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Log a new score</button>}
    <h3 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mt-5 mb-2">Score history</h3>
    {!scores.length ? <p className="text-sm text-muted-foreground">No scores recorded yet.</p> : <div className="space-y-1">{[...scores].sort((a, b) => new Date(b.test_date) - new Date(a.test_date)).map((score) => <div key={score.id} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5"><span className="text-sm">{day(score.test_date)}</span><span className="font-black tabular-nums">{score.score}</span></div>)}</div>}
  </>;
}

function PhysicalHistory({ assessments, benchmarks, player }) {
  const sorted = useMemo(() => [...assessments].sort((a, b) => new Date(b.assessment_date || b.created_date) - new Date(a.assessment_date || a.created_date)), [assessments]);
  const [selected, setSelected] = useState(null);
  useEffect(() => { if (!selected || !sorted.some((row) => row.id === selected)) setSelected(sorted[0]?.id || null); }, [sorted, selected]);
  const current = sorted.find((row) => row.id === selected) || sorted[0];
  if (!current) return <Empty>No physical assessments yet. The 20m dash, vertical jump, 5-10-5 agility and YIRT endurance results will appear here.</Empty>;
  const currentIndex = sorted.findIndex((row) => row.id === current.id);
  const previous = sorted[currentIndex + 1];
  const gender = developmentGender(player);
  const overall = computePhysicalScore(current, benchmarks, gender) ?? current.overall;
  const subscores = computePhysicalSubScores(current, benchmarks, gender);
  return <>
    <Panel className="bg-primary text-primary-foreground border-primary mb-3">
      <div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-bold uppercase tracking-wider opacity-80">Physical index</div><div className="text-4xl font-black tabular-nums">{overall ?? "—"}<span className="text-sm opacity-70">{overall != null ? "/100" : ""}</span></div></div><Activity className="w-10 h-10 opacity-70" /></div>
      <select aria-label="Assessment date" value={current.id} onChange={(event) => setSelected(event.target.value)} className="mt-3 w-full min-h-[44px] rounded-xl bg-background text-foreground px-3 text-sm font-semibold border-0">
        {sorted.map((row, index) => <option key={row.id} value={row.id}>{day(row.assessment_date)}{index === 0 ? " · Latest" : ""}</option>)}
      </select>
    </Panel>
    <div className="grid grid-cols-2 gap-2">{PHYSICAL_FIELDS.map((field) => {
      const value = current[field.key];
      const old = previous?.[field.key];
      const delta = value != null && old != null ? Number(value) - Number(old) : null;
      const improved = delta == null ? null : field.lowerBetter ? delta < 0 : delta > 0;
      const score = subscores[field.scoreKey] ?? current[field.scoreKey];
      return <Panel key={field.key} className="p-3">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-muted-foreground"><Timer className="w-3.5 h-3.5" />{field.label}</div>
        <div className="mt-2 text-2xl font-black tabular-nums">{value ?? "—"}<span className="text-xs font-semibold text-muted-foreground ml-1">{value != null ? field.unit : ""}</span></div>
        <div className="mt-1 flex items-center justify-between text-[11px]"><span className="font-bold text-primary">{score != null ? `${score}/100` : "No benchmark"}</span>{delta != null && delta !== 0 && <span className={improved ? "text-primary font-semibold" : "text-muted-foreground"}>{Math.abs(delta).toFixed(2)} {field.unit} {improved ? "better" : "change"}</span>}</div>
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, score || 0))}%` }} /></div>
      </Panel>;
    })}</div>
    {current.notes && <Panel className="mt-3"><div className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Staff notes</div><p className="text-sm mt-1 whitespace-pre-wrap">{current.notes}</p></Panel>}
    <p className="text-xs text-muted-foreground text-center mt-3">{sorted.length} assessment{sorted.length === 1 ? "" : "s"} on file · select a date above for history</p>
  </>;
}

function Field({ label, value, onChange, type = "text", ...props }) {
  return <label className="block"><span className="text-xs font-bold text-muted-foreground">{label}</span><input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full min-h-[48px] rounded-xl border border-border bg-card px-3 text-base outline-none focus:ring-2 focus:ring-ring" {...props} /></label>;
}

function SaveButton({ busy, disabled, onClick, children }) {
  return <button disabled={busy || disabled} onClick={onClick} className="mt-4 w-full min-h-[50px] rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40 flex items-center justify-center gap-2">{busy && <Loader2 className="w-4 h-4 animate-spin" />}{children}</button>;
}

function SkillEntrySheet({ tests, initialTest, player, user, scope, onClose, onSaved }) {
  const [testId, setTestId] = useState(initialTest?.id || tests[0]?.id || "");
  const [score, setScore] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const test = tests.find((item) => item.id === testId);
      const values = skillResultValues({ test, score });
      await base44.entities.SkillTestScore.create({ ...scope, ...values, player_name: playerName(player), test_date: date, notes: notes.trim() || null, logged_by: user?.full_name || user?.email });
      haptic("success"); toast.success("Skill score saved"); onSaved(); onClose();
    } catch (error) { toast.error(error?.message || "Couldn’t save the score."); } finally { setBusy(false); }
  };
  return <NativeSheet open onClose={() => !busy && onClose()} title="Log skill score">
    <label className="block"><span className="text-xs font-bold text-muted-foreground">Test</span><select value={testId} onChange={(event) => setTestId(event.target.value)} className="mt-1 w-full min-h-[48px] rounded-xl border border-border bg-card px-3 text-base">{tests.map((test) => <option key={test.id} value={test.id}>{test.category === "advanced" ? "Advanced" : "Basic"} · {test.title}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-3 mt-4"><Field label="Score" type="number" min="0" step="any" inputMode="decimal" autoFocus={!!initialTest} value={score} onChange={setScore} /><Field label="Test date" type="date" value={date} onChange={setDate} /></div>
    <label className="block mt-4"><span className="text-xs font-bold text-muted-foreground">Notes (optional)</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-base" /></label>
    <SaveButton busy={busy} disabled={!testId || score === ""} onClick={save}>Save skill score</SaveButton>
  </NativeSheet>;
}

function PhysicalEntrySheet({ player, user, scope, benchmarks, onClose, onSaved }) {
  const [form, setForm] = useState({ assessment_date: today(), notes: "" });
  const [busy, setBusy] = useState(false);
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const save = async () => {
    setBusy(true);
    try {
      const values = physicalAssessmentValues(form);
      const gender = developmentGender(player);
      const subscores = computePhysicalSubScores(values, benchmarks, gender);
      const overall = computePhysicalScore(values, benchmarks, gender);
      await base44.entities.PhysicalAssessment.create({ ...scope, ...values, ...subscores, overall, player_name: playerName(player), assessment_date: form.assessment_date, notes: form.notes.trim() || null, assessed_by: user?.full_name || user?.email });
      haptic("success"); toast.success("Physical assessment saved"); onSaved(); onClose();
    } catch (error) { toast.error(error?.message || "Couldn’t save the assessment."); } finally { setBusy(false); }
  };
  return <NativeSheet open onClose={() => !busy && onClose()} title="Log physical assessment">
    <p className="text-sm text-muted-foreground mb-4">Enter one test now or complete all four. Blank tests stay unscored.</p>
    <div className="grid grid-cols-2 gap-3">{PHYSICAL_FIELDS.map((field) => <Field key={field.key} label={`${field.label} (${field.unit})`} type="number" min="0" step={field.step} inputMode="decimal" value={form[field.key]} onChange={(value) => set(field.key, value)} />)}</div>
    <div className="mt-4"><Field label="Assessment date" type="date" value={form.assessment_date} onChange={(value) => set("assessment_date", value)} /></div>
    <label className="block mt-4"><span className="text-xs font-bold text-muted-foreground">Notes (optional)</span><textarea value={form.notes} onChange={(event) => set("notes", event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-base" /></label>
    <SaveButton busy={busy} onClick={save}>Save assessment</SaveButton>
  </NativeSheet>;
}
