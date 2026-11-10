import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import EvalSlider from "./EvalSlider";
import { computePhysicalScore } from "@/lib/testScoring";
import { POSITION_OPTIONS } from "@/lib/positions";

const TECHNICAL = {
  left: [
    { key: "first_touch", label: "First Touch" },
    { key: "receiving_under_pressure", label: "Receiving Under Pressure" },
    { key: "finishing", label: "Finishing" },
    { key: "crossing_service", label: "Crossing / Service" },
  ],
  right: [
    { key: "passing", label: "Passing" },
    { key: "dribbling_1v1", label: "Dribbling / 1v1" },
    { key: "heading", label: "Heading" },
    { key: "tackling_defending", label: "Tackling / Defending" },
  ],
};

const TACTICAL_GROUPS = [
  {
    name: "Defending",
    items: [
      { key: "defending_organized", label: "Defending Organized" },
      { key: "defending_transition", label: "Defending Transition" },
      { key: "defending_set_pieces", label: "Defending Set Pieces" },
      { key: "defending_final_third", label: "Defending Final Third" },
      { key: "pressing", label: "Pressing" },
    ],
  },
  {
    name: "Attacking",
    items: [
      { key: "attacking_organized", label: "Attacking Organized" },
      { key: "attacking_in_transition", label: "Attacking in Transition" },
      { key: "attacking_set_pieces", label: "Attacking Set Pieces" },
      { key: "attacking_final_third", label: "Attacking Final Third" },
      { key: "building_out", label: "Building Out" },
    ],
  },
  {
    name: "Position Roles",
    items: [
      { key: "line_breaking", label: "Line Breaking" },
      { key: "possession_retention", label: "Possession Retention" },
      { key: "pressing_regaining", label: "Pressing & Regaining" },
      { key: "goal_scoring", label: "Goal Scoring" },
    ],
  },
];

const MENTAL = [
  { letter: "M", key: "mindset", label: "Mindset" },
  { letter: "E", key: "effort", label: "Effort" },
  { letter: "N", key: "next_play_focus", label: "Next Play Focus" },
  { letter: "T", key: "team_first", label: "Team First" },
  { letter: "A", key: "assuredness", label: "Awareness" },
  { letter: "L", key: "leadership", label: "Leadership" },
];

function SectionHeader({ color, children }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-white font-bold text-xs tracking-wider uppercase"
      style={{ background: color }}
    >
      {children}
    </div>
  );
}

function AITextArea({ label, value, onChange, accent }) {
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  const generate = async (context) => {
    setLoading(true);
    try {
      const prompt = `You are a soccer coach writing a concise ${label.toLowerCase()} summary for a player evaluation.
Context: ${context}
Write 2-3 sentences. Be specific and actionable. Do not use placeholders.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt, model: "gpt_5_mini" });
      onChange(typeof res === "string" ? res : res?.text || "");
      setEditing(true);
    } catch {
      toast.error("AI generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => generate(label)}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-white"
            style={{ background: accent }}
          >
            {loading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
            AI-GEN
          </button>
          <button onClick={() => setEditing(!editing)} className="text-slate-400 hover:text-slate-700">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
          </button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => { onChange(e.target.value); setEditing(true); }}
        placeholder={`Enter ${label.toLowerCase()}…`}
        rows={2}
        className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-md p-2.5 resize-none focus:outline-none focus:border-primary"
      />
    </div>
  );
}

export default function CreateEvaluationDialog({ open, onOpenChange, player, latestPhysical, benchmarks, onSaved, evaluation }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const defaultPos = player?.position || POSITION_OPTIONS[0]?.value || "1 - Goalkeeper";

  const [form, setForm] = useState({
    primary_position: defaultPos,
    preferred_foot: "Right",
    technical_scores: {},
    tactical_scores: {},
    mental_scores: {},
    strengths: "",
    areas_of_growth: "",
    training_focus: "",
  });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (evaluation) {
      setForm({
        primary_position: evaluation.primary_position || player?.position || defaultPos,
        preferred_foot: evaluation.preferred_foot || "Right",
        technical_scores: evaluation.technical_scores || {},
        tactical_scores: evaluation.tactical_scores || {},
        mental_scores: evaluation.mental_scores || {},
        strengths: evaluation.strengths || "",
        areas_of_growth: evaluation.areas_of_growth || "",
        training_focus: evaluation.training_focus || "",
      });
    } else {
      setForm({
        primary_position: player?.position || defaultPos,
        preferred_foot: "Right",
        technical_scores: {},
        tactical_scores: {},
        mental_scores: {},
        strengths: "",
        areas_of_growth: "",
        training_focus: "",
      });
    }
  }, [open, player, evaluation, defaultPos]);

  const setScore = (group, key, val) =>
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: val } }));

  const physicalScore = useMemo(() => {
    if (!latestPhysical) return null;
    return computePhysicalScore(latestPhysical, benchmarks, player?.gender === "Boys" ? "male" : player?.gender === "Girls" ? "female" : "all");
  }, [latestPhysical, benchmarks, player]);

  const allScores = useMemo(() => {
    return [
      ...Object.values(form.technical_scores),
      ...Object.values(form.tactical_scores),
      ...Object.values(form.mental_scores),
      physicalScore != null ? physicalScore / 10 : null,
    ].filter((v) => v != null);
  }, [form, physicalScore]);

  const overall = allScores.length ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1) : "—";

  const aiContext = useMemo(() => {
    return `Position: ${form.primary_position}. Technical: ${JSON.stringify(form.technical_scores)}. Tactical: ${JSON.stringify(form.tactical_scores)}. Mental: ${JSON.stringify(form.mental_scores)}. Physical score: ${physicalScore ?? "N/A"}.`;
  }, [form, physicalScore]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        player_id: player.id,
        player_name: `${player.first_name} ${player.last_name}`,
        evaluator_email: "coach@jaguars.com",
        evaluation_date: evaluation?.evaluation_date || today,
        primary_position: form.primary_position,
        preferred_foot: form.preferred_foot,
        physical_score: physicalScore,
        technical_scores: form.technical_scores,
        tactical_scores: form.tactical_scores,
        mental_scores: form.mental_scores,
        overall_score: parseFloat(overall) || null,
        strengths: form.strengths,
        areas_of_growth: form.areas_of_growth,
        training_focus: form.training_focus,
        status: "completed",
      };
      if (evaluation?.id) {
        await base44.entities.PlayerEvaluation.update(evaluation.id, payload);
        toast.success("Evaluation updated");
      } else {
        await base44.entities.PlayerEvaluation.create(payload);
        toast.success("Evaluation saved to player record");
      }
      qc.invalidateQueries({ queryKey: ["player-evaluations", player.id] });
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to save evaluation");
    } finally {
      setSaving(false);
    }
  };

  if (!player) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-white border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-wide uppercase">
                {evaluation ? "Edit" : "Create"} Evaluation — {player.first_name} {player.last_name}
              </h2>
              <p className="text-[10px] text-slate-500 tracking-wider uppercase mt-0.5">
                Explosive • Precise • Insightful • Combative — 1 (Basic) — 10 (Expert)
              </p>
            </div>
            <button onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Controls Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1 block">Primary Position</label>
              <Select value={form.primary_position} onValueChange={(v) => setForm((f) => ({ ...f, primary_position: v }))}>
                <SelectTrigger className="bg-white border-slate-200 text-slate-900 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POSITION_OPTIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1 block">Preferred Foot</label>
              <Select value={form.preferred_foot} onValueChange={(v) => setForm((f) => ({ ...f, preferred_foot: v }))}>
                <SelectTrigger className="bg-white border-slate-200 text-slate-900 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Left">Left</SelectItem>
                  <SelectItem value="Right">Right</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Physical Block */}
          <div className="rounded-lg overflow-hidden bg-slate-50 border border-slate-200">
            <SectionHeader color="#ef4444">Explosive Physical — From Fitness Assessment</SectionHeader>
            <div className="p-4">
              {physicalScore != null ? (
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-extrabold text-slate-900">{physicalScore}<span className="text-sm text-slate-400">/100</span></div>
                  <div className="text-xs text-slate-600">
                    Sprint: {latestPhysical.sprint_20m_seconds ?? "—"}s · Vertical: {latestPhysical.vertical_jump_inches ?? "—"}" · 5-10-5: {latestPhysical.agility_5_10_5_seconds ?? "—"}s · Yo-Yo: {latestPhysical.yoyo_level ?? "—"}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No physical assessment on file. Complete a physical test to populate the Explosive score automatically.</p>
              )}
            </div>
          </div>

          {/* Technical Block */}
          <div className="rounded-lg overflow-hidden bg-slate-50 border border-slate-200">
            <SectionHeader color="#3b82f6">Precise Technical</SectionHeader>
            <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
              {TECHNICAL.left.map((s) => (
                <EvalSlider key={s.key} label={s.label} value={form.technical_scores[s.key]} onChange={(v) => setScore("technical_scores", s.key, v)} accent="#3b82f6" />
              ))}
              {TECHNICAL.right.map((s) => (
                <EvalSlider key={s.key} label={s.label} value={form.technical_scores[s.key]} onChange={(v) => setScore("technical_scores", s.key, v)} accent="#3b82f6" />
              ))}
            </div>
          </div>

          {/* Tactical Block */}
          <div className="rounded-lg overflow-hidden bg-slate-50 border border-slate-200">
            <SectionHeader color="#22c55e">Insightful Tactical — {form.primary_position}</SectionHeader>
            <div className="p-4 space-y-4">
              {TACTICAL_GROUPS.map((grp) => (
                <div key={grp.name}>
                  <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-2">{grp.name}</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {grp.items.map((s) => (
                      <EvalSlider key={s.key} label={s.label} value={form.tactical_scores[s.key]} onChange={(v) => setScore("tactical_scores", s.key, v)} accent="#22c55e" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mental Block */}
          <div className="rounded-lg overflow-hidden bg-slate-50 border border-slate-200">
            <SectionHeader color="#eab308">Combative Competitive M.E.N.T.A.L.</SectionHeader>
            <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
              {MENTAL.map((m) => (
                <EvalSlider key={m.key} label={`${m.letter} — ${m.label}`} value={form.mental_scores[m.key]} onChange={(v) => setScore("mental_scores", m.key, v)} accent="#eab308" />
              ))}
            </div>
          </div>

          {/* Footer Text Areas */}
          <div className="rounded-lg bg-slate-50 border border-slate-200">
            <div className="p-4 space-y-3">
              <AITextArea label="Player Strengths" value={form.strengths} onChange={(v) => setForm((f) => ({ ...f, strengths: v }))} accent="#22c55e" />
              <AITextArea label="Areas of Growth" value={form.areas_of_growth} onChange={(v) => setForm((f) => ({ ...f, areas_of_growth: v }))} accent="#eab308" />
              <AITextArea label="Training Focus" value={form.training_focus} onChange={(v) => setForm((f) => ({ ...f, training_focus: v }))} accent="#3b82f6" />
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-900">
            Overall: <span className="text-lg" style={{ color: "#22c55e" }}>{overall}/10</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-300 text-slate-700 hover:bg-slate-100">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Evaluation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}