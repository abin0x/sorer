import React, { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TENET_COLORS } from "@/components/adisal/ui";

const TECH_KEYS = [
  { key: "first_touch", label: "First Touch" },
  { key: "passing", label: "Passing" },
  { key: "receiving_under_pressure", label: "Receiving Under Pressure" },
  { key: "dribbling_1v1", label: "Dribbling / 1v1" },
  { key: "finishing", label: "Finishing" },
  { key: "heading", label: "Heading" },
  { key: "crossing_service", label: "Crossing / Service" },
  { key: "tackling_defending", label: "Tackling / Defending" },
];

const TAC_GROUPS = [
  { name: "Defending", items: [
    { key: "defending_organized", label: "Defending Organized" },
    { key: "defending_transition", label: "Defending Transition" },
    { key: "defending_set_pieces", label: "Defending Set Pieces" },
    { key: "defending_final_third", label: "Defending Final Third" },
    { key: "pressing", label: "Pressing" },
  ]},
  { name: "Attacking", items: [
    { key: "attacking_organized", label: "Attacking Organized" },
    { key: "attacking_final_third", label: "Attacking Final Third" },
    { key: "attacking_transition", label: "Attacking Transition" },
    { key: "attacking_set_pieces", label: "Attacking Set Pieces" },
    { key: "building_out", label: "Building Out" },
  ]},
  { name: "Position Roles", items: [
    { key: "line_breaking", label: "Line Breaking" },
    { key: "possession_retention", label: "Possession Retention" },
    { key: "pressing_regaining", label: "Pressing & Regaining" },
    { key: "goal_scoring", label: "Goal Scoring" },
  ]},
];

const MENTAL_KEYS = [
  { key: "mindset", label: "Mindset" },
  { key: "effort", label: "Effort" },
  { key: "next_play_focus", label: "Next Play Focus" },
  { key: "team_first", label: "Team First" },
  { key: "assuredness", label: "Awareness" },
  { key: "leadership", label: "Leadership" },
];

function avgOfScores(scores, keys) {
  const vals = keys.map(k => scores?.[k]).filter(v => v != null);
  return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—";
}

function ScoreRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-muted/30">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold ${value != null ? "text-foreground" : "text-muted-foreground/40"}`}>{value ?? "—"}</span>
    </div>
  );
}

function EpicBar({ label, value, color }) {
  const pct = Math.min(100, (Number(value) || 0) * 10);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-16 text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-medium w-8 text-right">{value ?? "—"}</span>
    </div>
  );
}

export default function EvaluationHistory({ playerId, evaluations, canEdit = false, onEdit }) {
  const qc = useQueryClient();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedEval, setSelectedEval] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data: allEvals = [] } = useQuery({
    queryKey: ["player-evaluations", playerId],
    queryFn: () => base44.entities.PlayerEvaluation.filter({ player_id: playerId }, "-evaluation_date", 50),
    enabled: !evaluations && !!playerId,
  });
  const data = evaluations || allEvals;

  const sorted = useMemo(() => [...data].sort((a, b) => new Date(b.evaluation_date) - new Date(a.evaluation_date)), [data]);

  useEffect(() => {
    if (currentIdx >= sorted.length) setCurrentIdx(0);
  }, [sorted.length, currentIdx]);

  if (!sorted.length) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground mb-3">No evaluations recorded yet.</p>
      </div>
    );
  }

  const current = sorted[currentIdx];
  const cycleNext = () => setCurrentIdx((prev) => (prev + 1) % sorted.length);
  const cyclePrev = () => setCurrentIdx((prev) => (prev - 1 + sorted.length) % sorted.length);

  const tacAllKeys = TAC_GROUPS.flatMap(g => g.items);
  const techAvg = current.technical_scores ? avgOfScores(current.technical_scores, TECH_KEYS.map(i => i.key)) : "—";
  const tacAvg = current.tactical_scores ? avgOfScores(current.tactical_scores, tacAllKeys.map(i => i.key)) : "—";
  const menAvg = current.mental_scores ? avgOfScores(current.mental_scores, MENTAL_KEYS.map(i => i.key)) : "—";

  const handleDelete = async (ev) => {
    if (!confirm("Delete this evaluation? This cannot be undone.")) return;
    setDeleting(ev.id);
    try {
      await base44.entities.PlayerEvaluation.delete(ev.id);
      toast.success("Evaluation deleted");
      qc.invalidateQueries({ queryKey: ["player-evaluations", playerId] });
    } catch {
      toast.error("Failed to delete evaluation");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Carousel header with arrows */}
      <div className="flex items-center justify-between p-3 surface-tile rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {currentIdx === 0 ? "Latest Evaluation" : `Evaluation ${currentIdx + 1} of ${sorted.length}`}
            </p>
            <p className="text-sm font-semibold">{current.evaluation_date ? format(new Date(current.evaluation_date), "MMM d, yyyy") : "—"}</p>
          </div>
        </div>
        {sorted.length > 1 && (
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={cyclePrev} title="Previous evaluation">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium text-muted-foreground px-1">{currentIdx + 1} / {sorted.length}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={cycleNext} title="Next evaluation">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Current evaluation card */}
      <div className="surface-tile rounded-lg overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {current.primary_position && <Badge variant="outline" className="text-xs">{current.primary_position}</Badge>}
              {current.preferred_foot && <Badge variant="secondary" className="text-xs">{current.preferred_foot}</Badge>}
            </div>
            <div className="flex items-center gap-1.5">
              {canEdit && (
                <>
                  <button onClick={() => onEdit?.(current)} className="p-1.5 rounded hover:bg-primary/10 text-primary" title="Edit evaluation">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(current)} disabled={deleting === current.id} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Delete evaluation">
                    {deleting === current.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-primary">{current.overall_score?.toFixed(1) ?? "—"}</span>
            <span className="text-sm text-muted-foreground">/ 10 overall</span>
          </div>
        </div>

        {/* EPIC summary tiles */}
        <div className="p-4">
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="text-center p-2 rounded-lg" style={{ background: TENET_COLORS.explosive.bg + "15" }}>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Explosive</p>
              <p className="text-xl font-extrabold" style={{ color: TENET_COLORS.explosive.bg }}>{current.physical_score ?? "—"}</p>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ background: TENET_COLORS.precise.bg + "15" }}>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Precise</p>
              <p className="text-xl font-extrabold" style={{ color: TENET_COLORS.precise.bg }}>{techAvg}</p>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ background: TENET_COLORS.insightful.bg + "15" }}>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Insightful</p>
              <p className="text-xl font-extrabold" style={{ color: TENET_COLORS.insightful.bg }}>{tacAvg}</p>
            </div>
            <div className="text-center p-2 rounded-lg" style={{ background: TENET_COLORS.combative.bg + "15" }}>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Combative</p>
              <p className="text-xl font-extrabold" style={{ color: TENET_COLORS.combative.bg }}>{menAvg}</p>
            </div>
          </div>

          {/* EPIC bars */}
          <div className="space-y-2 mb-4">
            <EpicBar label="Explosive" value={current.physical_score} color={TENET_COLORS.explosive.bg} />
            <EpicBar label="Precise" value={techAvg} color={TENET_COLORS.precise.bg} />
            <EpicBar label="Insightful" value={tacAvg} color={TENET_COLORS.insightful.bg} />
            <EpicBar label="Combative" value={menAvg} color={TENET_COLORS.combative.bg} />
          </div>

          {/* Text fields */}
          {current.strengths && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-1">Strengths</p>
              <p className="text-sm text-foreground">{current.strengths}</p>
            </div>
          )}
          {current.areas_of_growth && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">Areas of Growth</p>
              <p className="text-sm text-foreground">{current.areas_of_growth}</p>
            </div>
          )}
          {current.training_focus && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400 mb-1">Training Focus</p>
              <p className="text-sm text-foreground">{current.training_focus}</p>
            </div>
          )}

          <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setSelectedEval(current)}>
            View Full E.P.I.C. Details
          </Button>
        </div>
      </div>

      {/* Evaluation detail popup */}
      <Dialog open={!!selectedEval} onOpenChange={(v) => !v && setSelectedEval(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Evaluation — {selectedEval?.evaluation_date ? format(new Date(selectedEval.evaluation_date), "MMM d, yyyy") : "—"}</span>
              {selectedEval?.primary_position && <Badge variant="outline" className="text-xs">{selectedEval.primary_position}</Badge>}
            </DialogTitle>
          </DialogHeader>

          {selectedEval && (
            <div className="space-y-4">
              {/* Overall + EPIC summary */}
              <div className="grid grid-cols-5 gap-2">
                <div className="text-center p-2 rounded-lg bg-primary/5">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Overall</p>
                  <p className="text-xl font-extrabold text-primary">{selectedEval.overall_score?.toFixed(1) ?? "—"}</p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: TENET_COLORS.explosive.bg + "20" }}>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Explosive</p>
                  <p className="text-xl font-extrabold" style={{ color: TENET_COLORS.explosive.bg }}>{selectedEval.physical_score ?? "—"}</p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: TENET_COLORS.precise.bg + "20" }}>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Precise</p>
                  <p className="text-xl font-extrabold" style={{ color: TENET_COLORS.precise.bg }}>{selectedEval.technical_scores ? avgOfScores(selectedEval.technical_scores, TECH_KEYS.map(i => i.key)) : "—"}</p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: TENET_COLORS.insightful.bg + "20" }}>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Insightful</p>
                  <p className="text-xl font-extrabold" style={{ color: TENET_COLORS.insightful.bg }}>{selectedEval.tactical_scores ? avgOfScores(selectedEval.tactical_scores, tacAllKeys.map(i => i.key)) : "—"}</p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ background: TENET_COLORS.combative.bg + "20" }}>
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Combative</p>
                  <p className="text-xl font-extrabold" style={{ color: TENET_COLORS.combative.bg }}>{selectedEval.mental_scores ? avgOfScores(selectedEval.mental_scores, MENTAL_KEYS.map(i => i.key)) : "—"}</p>
                </div>
              </div>

              {/* Technical scores */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: TENET_COLORS.precise.bg }} />
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Precise — Technical Skills</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {TECH_KEYS.map(({ key, label }) => (
                    <ScoreRow key={key} label={label} value={selectedEval.technical_scores?.[key]} />
                  ))}
                </div>
              </div>

              {/* Tactical scores */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: TENET_COLORS.insightful.bg }} />
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Insightful — Tactical</span>
                </div>
                {TAC_GROUPS.map(group => (
                  <div key={group.name} className="mb-2">
                    <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase mb-1">{group.name}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {group.items.map(({ key, label }) => (
                        <ScoreRow key={key} label={label} value={selectedEval.tactical_scores?.[key]} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mental scores */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: TENET_COLORS.combative.bg }} />
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Combative — Mental (M.E.N.T.A.L.)</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {MENTAL_KEYS.map(({ key, label }) => (
                    <ScoreRow key={key} label={label} value={selectedEval.mental_scores?.[key]} />
                  ))}
                </div>
              </div>

              {/* Text fields */}
              {selectedEval.strengths && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-1">Strengths</p>
                  <p className="text-sm text-foreground">{selectedEval.strengths}</p>
                </div>
              )}
              {selectedEval.areas_of_growth && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">Areas of Growth</p>
                  <p className="text-sm text-foreground">{selectedEval.areas_of_growth}</p>
                </div>
              )}
              {selectedEval.training_focus && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400 mb-1">Training Focus</p>
                  <p className="text-sm text-foreground">{selectedEval.training_focus}</p>
                </div>
              )}

              {canEdit && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button size="sm" variant="outline" onClick={() => { onEdit?.(selectedEval); setSelectedEval(null); }}>
                    <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit Evaluation
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}