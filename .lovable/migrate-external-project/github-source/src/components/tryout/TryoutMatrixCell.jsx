import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus } from "lucide-react";

const STATUS_STYLES = {
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  completed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export default function TryoutMatrixCell({ ageGroup, format, gender, teams, plan, onCreatePlan }) {
  const coachNames = Array.from(
    new Set(teams.flatMap((t) => (t.coach_names?.length ? t.coach_names : [t.coach_name]).filter(Boolean)))
  );
  const missingNextSeasonCoach = teams.some((t) => !t.next_season_coach_id);

  if (teams.length === 0) {
    return <div className="min-h-[92px] rounded-lg border border-dashed border-border/60" />;
  }

  return (
    <div className="min-h-[92px] rounded-lg border border-border bg-card p-2.5 flex flex-col gap-1.5 select-none">
      <div className="flex items-center justify-between gap-1">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
          <Users className="w-3 h-3 text-muted-foreground" />
          {teams.length} team{teams.length !== 1 ? "s" : ""}
        </span>
        {plan && (
          <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_STYLES[plan.status] || STATUS_STYLES.draft}`}>
            {plan.status}
          </Badge>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground truncate" title={coachNames.join(", ")}>
        {coachNames.length ? coachNames.join(", ") : "No coach assigned"}
      </p>

      {missingNextSeasonCoach && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400">Next-season coach needed</p>
      )}

      {plan ? (
        <Link
          to={`/TryoutPlanDetail?id=${plan.id}`}
          className="mt-auto text-xs font-medium text-primary truncate hover:underline"
          title={plan.title}
        >
          {plan.title}
        </Link>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="mt-auto h-7 text-xs justify-start gap-1 min-h-[44px] sm:min-h-[28px]"
          onClick={() => onCreatePlan({ ageGroup, format, gender, teams })}
        >
          <Plus className="w-3 h-3" />
          Create Tryout Plan
        </Button>
      )}
    </div>
  );
}