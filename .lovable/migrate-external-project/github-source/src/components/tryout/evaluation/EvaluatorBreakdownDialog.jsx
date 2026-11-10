import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TriangleAlert } from "lucide-react";
import { gradeTone, recommendationLabel, recommendationTone } from "@/lib/evaluationCriteria";

/** One player's full evaluation picture: what each coach scored and said. */
export default function EvaluatorBreakdownDialog({ open, row, criteria, onClose }) {
  if (!row) return null;
  const agg = row.aggregate;
  const evaluators = row.evaluators || [];

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row.player_name}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {row.bib ? `Bib ${row.bib} · ` : ""}
            {row.age != null ? `Age ${row.age} · ` : ""}
            {row.group_key}
          </p>
        </DialogHeader>

        <div className="space-y-3">
          {agg?.count > 0 && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Combined · {agg.count} coach{agg.count > 1 ? "es" : ""}
                </p>
                <Badge className={`${gradeTone(Math.round(agg.overall))} border-transparent`}>{agg.overall}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {criteria.map((c) => (
                  <p key={c.key} className="text-xs text-muted-foreground flex justify-between gap-2">
                    <span className="truncate">{c.label}</span>
                    <span className="font-medium text-foreground">{agg.criteria?.[c.key] ?? "—"}</span>
                  </p>
                ))}
              </div>
              {agg.disagreement && (
                <p className="text-xs text-status-warning-700 flex items-start gap-1.5">
                  <TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Evaluators disagree: grades differ by {agg.spread || agg.criteria_spread} point
                  {(agg.spread || agg.criteria_spread) > 1 ? "s" : ""}
                  {agg.rec_split ? ", and they split on the recommendation" : ""}.
                </p>
              )}
            </div>
          )}

          {evaluators.length === 0 ? (
            <p className="text-sm text-muted-foreground">No coach has scored this player yet.</p>
          ) : (
            evaluators.map((e) => (
              <div key={e.email || e.name} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {e.name}{e.is_me ? " (you)" : ""}
                  </span>
                  <Badge className={`${gradeTone(e.overall_grade)} border-transparent`}>
                    {e.overall_grade || "—"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {criteria.map((c) => (
                    <p key={c.key} className="text-xs text-muted-foreground flex justify-between gap-2">
                      <span className="truncate">{c.label}</span>
                      <span className="font-medium text-foreground">{e.scores?.[c.key] ?? "—"}</span>
                    </p>
                  ))}
                </div>
                {e.recommendation && (
                  <span className={`inline-block text-[11px] px-1.5 py-0.5 rounded border ${recommendationTone(e.recommendation)}`}>
                    {recommendationLabel(e.recommendation)}
                  </span>
                )}
                {e.notes && <p className="text-xs text-muted-foreground">{e.notes}</p>}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}