import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Save, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { saveEvaluation, SKILL_LABELS, computeOverall } from "@/lib/tryoutDay";

const CATEGORIES = [
  { key: "technical", label: "Technical", skills: ["first_touch", "passing", "dribbling_1v1", "finishing", "tackling_defending"] },
  { key: "tactical", label: "Tactical", skills: ["attacking_organized", "defending_organized", "pressing", "building_out"] },
  { key: "mental", label: "Mental", skills: ["mindset", "effort", "leadership"] },
];

/** Offline-capable quick evaluation: rate 1-10 per skill, auto-saves per player. */
export default function QuickEvaluation({ event, clubId, currentUser }) {
  const qc = useQueryClient();
  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState({});
  const [dirty, setDirty] = useState(false);

  const { data: regs = [] } = useQuery({
    queryKey: ["eval-regs", event?.id],
    queryFn: () => base44.entities.TryoutRegistration.filter({ tryout_event_id: event.id, checked_in: true }, "player_name", 500),
    enabled: !!event?.id,
  });

  const playerIds = regs.map((r) => r.player_id).filter(Boolean);
  const { data: evals = {} } = useQuery({
    queryKey: ["event-evals", playerIds.join(",")],
    queryFn: async () => {
      const all = await base44.entities.PlayerEvaluation.filter({ player_id: { $in: playerIds } }, "-evaluation_date", 500).catch(() => []);
      const byPlayer = {};
      all.forEach((e) => { if (!byPlayer[e.player_id] || new Date(e.evaluation_date) > new Date(byPlayer[e.player_id].evaluation_date)) byPlayer[e.player_id] = e; });
      return byPlayer;
    },
    enabled: playerIds.length > 0,
  });

  const current = regs[idx];
  const existing = current ? evals[current.player_id] : null;

  React.useEffect(() => {
    if (current && existing) {
      setScores({ technical: existing.technical_scores || {}, tactical: existing.tactical_scores || {}, mental: existing.mental_scores || {} });
    } else {
      setScores({});
    }
    setDirty(false);
  }, [idx, current?.id, existing?.id]);

  const setScore = (cat, skill, val) => { setScores((s) => ({ ...s, [cat]: { ...s[cat], [skill]: val } })); setDirty(true); };

  const save = async () => {
    if (!current?.player_id) { toast.error("No player profile linked to this registration."); return; }
    await saveEvaluation({ clubId, registration: current, scores, evaluatorEmail: currentUser?.email });
    toast.success(`${current.player_name} evaluated`);
    setDirty(false);
    qc.invalidateQueries({ queryKey: ["event-evals"] });
  };

  const next = () => { if (dirty) save(); setIdx((i) => Math.min(i + 1, regs.length - 1)); };
  const prev = () => { if (dirty) save(); setIdx((i) => Math.max(i - 1, 0)); };

  if (!event) return <p className="text-sm text-muted-foreground">Select an event to evaluate players.</p>;
  if (regs.length === 0) return <p className="text-sm text-muted-foreground">No checked-in players to evaluate yet.</p>;
  if (!current) return null;

  const overall = computeOverall(scores);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={prev} disabled={idx === 0}><ChevronLeft className="w-4 h-4" /></Button>
          <div><p className="text-sm font-semibold">{current.player_name}</p><p className="text-xs text-muted-foreground">Player {idx + 1} of {regs.length}</p></div>
          <Button size="icon" variant="outline" onClick={next} disabled={idx === regs.length - 1}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <div className="flex items-center gap-3">
          {existing && !dirty && <Badge variant="outline" className="text-xs gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Scored: {existing.overall_score}</Badge>}
          <div className="text-right"><p className="text-2xl font-bold text-primary">{overall || "—"}</p><p className="text-xs text-muted-foreground">Overall</p></div>
          <Button onClick={save} disabled={!dirty} className="gap-1.5"><Save className="w-4 h-4" /> Save</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {CATEGORIES.map((cat) => (
          <Card key={cat.key}><CardContent className="p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{cat.label}</p>
            {cat.skills.map((skill) => (
              <div key={skill} className="flex items-center justify-between gap-2">
                <span className="text-xs text-foreground">{SKILL_LABELS[skill]}</span>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                    <button key={n} onClick={() => setScore(cat.key, skill, n)}
                      className={`w-5 h-5 rounded text-[10px] font-bold transition-colors ${(scores[cat.key]?.[skill] || 0) >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/30"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}