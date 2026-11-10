import useDashboardData from "../shared/useDashboardData";
import useCycleData from "../shared/useCycleData";
import { resolveScope } from "@/lib/seasonLifecycle";

/**
 * Club-wide (unscoped) lifecycle data plus the Club Admin's branch scope.
 * Queries are shared via react-query cache, so calling this alongside the
 * dashboards' own hooks costs nothing extra.
 */
export default function useLifecycleContext() {
  const dash = useDashboardData();
  const cycle = useCycleData();
  const scope = resolveScope(cycle.lifecycleSeason, dash.locations);
  const data = {
    seasons: cycle.seasons,
    ageGroups: cycle.ageGroups,
    tryoutPlans: cycle.tryoutPlans,
    tryouts: dash.tryouts,
    tryoutRegs: dash.tryoutRegs,
    teams: dash.teams,
    players: dash.players,
    finalRegs: cycle.finalRegs,
    teamPlans: cycle.teamPlans,
    posts: cycle.posts,
  };
  return { dash, cycle, scope, data, season: cycle.lifecycleSeason, locations: dash.locations };
}