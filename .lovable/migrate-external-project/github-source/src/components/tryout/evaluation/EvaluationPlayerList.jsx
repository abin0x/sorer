import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, TriangleAlert } from "lucide-react";
import { recommendationLabel, recommendationTone, gradeTone } from "@/lib/evaluationCriteria";

function PlayerAvatar({ name, url }) {
  const initials = (name || "")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (url) {
    return <img src={url} alt={name} className="w-11 h-11 rounded-full object-cover border border-border" />;
  }
  return (
    <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold border border-border">
      {initials || "?"}
    </div>
  );
}

/** The field list: bib, name, age and photo — tap a player to score them. */
export default function EvaluationPlayerList({ rows, canSeeOthers, onOpen }) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No players to score here yet. Players appear once they are registered in this session.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => {
        const scored = !!row.mine && Object.keys(row.mine.scores || {}).length > 0;
        return (
          <button
            key={row.registration_id}
            type="button"
            onClick={() => onOpen(index)}
            className="w-full text-left bg-card border border-border rounded-xl p-3 flex items-center gap-3 min-h-[68px] transition-colors active:bg-accent hover:border-primary/40"
          >
            <PlayerAvatar name={row.player_name} url={row.photo_url} />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-foreground shrink-0">
                  {row.bib ? `#${row.bib}` : "—"}
                </span>
                <span className="font-semibold text-sm text-foreground truncate">{row.player_name}</span>
                {row.checked_in ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-success-700 shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {row.age != null ? `Age ${row.age}` : "Age unknown"}
                {row.age_group ? ` · ${row.age_group}` : ""}
                {canSeeOthers && row.aggregate?.count
                  ? ` · Avg ${row.aggregate.overall || "—"} from ${row.aggregate.count} coach${row.aggregate.count > 1 ? "es" : ""}`
                  : row.evaluations_count
                    ? ` · ${row.evaluations_count} coach${row.evaluations_count > 1 ? "es" : ""} scored`
                    : ""}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              {scored ? (
                <>
                  <Badge className={`${gradeTone(row.mine.overall_grade)} border-transparent`}>
                    {row.mine.overall_grade || "—"}
                  </Badge>
                  {row.mine.recommendation && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${recommendationTone(row.mine.recommendation)}`}>
                      {recommendationLabel(row.mine.recommendation)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs font-medium text-primary">Score</span>
              )}
              {canSeeOthers && row.aggregate?.disagreement && (
                <span className="text-[10px] text-status-warning-700 flex items-center gap-1">
                  <TriangleAlert className="w-3 h-3" /> Disagree
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}