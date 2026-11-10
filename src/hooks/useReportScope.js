import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/** Returns the branch IDs a branch-scoped user may see (null = all branches). */
function useBranchScope(user, clubId, access) {
  return useQuery({
    queryKey: ["reports-branch-scope", clubId, user?.email, access?.isBranchScoped],
    queryFn: async () => {
      if (!access?.isBranchScoped) return null;
      const locations = await base44.entities.Location.filter({ club_id: clubId });
      return locations
        .filter((l) => l.branch_director_email === user.email || l.branch_admin_email === user.email)
        .map((l) => l.id);
    },
    enabled: !!clubId && !!user?.email,
  });
}

/** Returns the team IDs a team-scoped user (coach) may see (null = all teams). */
function useTeamScope(user, clubId, access) {
  return useQuery({
    queryKey: ["reports-team-scope", clubId, user?.email, access?.isTeamScoped],
    queryFn: async () => {
      if (!access?.isTeamScoped) return null;
      const coaches = await base44.entities.Coach.filter({ email: user.email });
      const coachIds = coaches.map((c) => c.id);
      if (coachIds.length === 0) return [];
      const teams = await base44.entities.Team.filter({ club_id: clubId });
      return teams.filter((t) => (t.coach_ids || []).some((id) => coachIds.includes(id))).map((t) => t.id);
    },
    enabled: !!clubId && !!user?.email,
  });
}

/**
 * Shared scope resolver for the Reports module. Returns effective branch/team IDs
 * (combining role scope with the user's dropdown choice) and a ready flag.
 * @param {Object} user
 * @param {string} clubId
 * @param {Object} access - from getReportAccess()
 * @param {Object} filters - { branchId, teamId, ... }
 */
export function useReportScope(user, clubId, access, filters) {
  const { data: branchScopeIds } = useBranchScope(user, clubId, access);
  const { data: teamScopeIds } = useTeamScope(user, clubId, access);

  const effBranchIds = access?.isBranchScoped
    ? (filters.branchId ? (branchScopeIds || []).filter((id) => id === filters.branchId) : branchScopeIds || [])
    : (filters.branchId ? [filters.branchId] : null);

  const effTeamIds = access?.isTeamScoped
    ? (filters.teamId ? (teamScopeIds || []).filter((id) => id === filters.teamId) : teamScopeIds || [])
    : (filters.teamId ? [filters.teamId] : null);

  const scopeReady =
    (!access?.isBranchScoped || branchScopeIds !== undefined) &&
    (!access?.isTeamScoped || teamScopeIds !== undefined);

  return { effBranchIds, effTeamIds, scopeReady };
}