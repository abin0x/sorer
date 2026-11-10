import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, TriangleAlert } from "lucide-react";
import { recommendationLabel, recommendationTone, gradeTone } from "@/lib/evaluationCriteria";
import { RetentionBadges } from '../PlayerRetentionReview';
import { useTerminology } from "@/hooks/useTerminology";
import { reviewLabel } from "@/lib/playerRetention";

function PlayerAvatar({ name, url }) {
  const initials = (name || "")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (url) {
    return <img src={url} alt={name} className="w-12 h-12 rounded-full object-cover border border-border" />;
  }
  return (
    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold border border-border">
      {initials || "?"}
    </div>
  );
}

/** The field list: bib, name, age and photo — tap a player to score them. */
export default function EvaluationPlayerList({ rows, canSeeOthers, onOpen, retention }) {
  const t = useTerminology();
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No players to score here yet. Players appear once they are registered in this session.
      </div>
    );
  }

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {rows.map((row, index) => {
        const scored = !!row.mine && (Object.keys(row.mine.scores || {}).length > 0 || row.mine.overall_grade > 0);
        const roleKey = retention?.reviewFor(row.player_id)?.team_role;
        return (
          <button
            key={row.registration_id}
            type="button"
            onClick={() => onOpen(index)}
            className={`w-full text-left bg-card border-2 rounded-2xl p-3 flex items-center gap-3 min-h-[76px] transition-all active:scale-[0.99] hover:shadow-sm ${scored ? "border-status-success/40" : "border-border hover:border-primary/40"}`}
          >
            <PlayerAvatar name={row.player_name} url={row.photo_url} />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black font-mono px-2 py-0.5 rounded-md bg-foreground text-background shrink-0">
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
              <RetentionBadges review={retention?.reviewFor(row.player_id)} coaches={retention?.coaches.filter((c)=>c.player_id===row.player_id)} />
            </div>

            <div className="flex flex-col items-end gap-1 shrink-0">
              {scored ? (
                <>
                  <Badge className="bg-foreground text-background border-transparent font-bold max-w-[120px] truncate">
                    {roleKey ? reviewLabel(t.teamRoles, roleKey) : row.mine.overall_grade ? `${row.mine.overall_grade}/5` : "—"}
                  </Badge>
                  {row.mine.recommendation && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${recommendationTone(row.mine.recommendation)}`}>
                      {recommendationLabel(row.mine.recommendation)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-primary text-primary-foreground">Score</span>
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