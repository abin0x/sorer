import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ROLES } from "@/lib/rbac";

/**
 * Returns the teams a user is allowed to bill expenses to.
 * - Club-wide roles (admin, club_director, club_admin, bookkeeper, branch_director,
 *   branch_admin, master_admin, system users) → all club teams.
 * - Coaches → only teams where they are assigned (Team.coach_ids includes a
 *   Coach record matching the user's email).
 * - Team managers → only teams where they are assigned (Team.team_manager_ids
 *   includes the user's guardian_id).
 *
 * Returns { teams, isScoped, isLoading }.
 */
export function useScopedTeams(user, clubId) {
  const role = user?.custom_role || user?.role;
  const isSystemUser = !!user?.is_super_admin || !!user?.system_role || user?.role === "admin";
  const clubWide =
    isSystemUser ||
    [
      ROLES.MASTER_ADMIN,
      ROLES.ADMIN,
      ROLES.CLUB_DIRECTOR,
      ROLES.CLUB_ADMIN,
      ROLES.BOOKKEEPER,
      ROLES.BRANCH_DIRECTOR,
      ROLES.BRANCH_ADMIN,
      ROLES.PROJECT_MANAGER,
      ROLES.PLATFORM_DIRECTOR,
      ROLES.AGE_GROUP_DIRECTOR,
    ].includes(role);
  const isCoach = role === ROLES.COACH;
  const isTeamManager = role === ROLES.TEAM_MANAGER;
  const isScoped = !clubWide && (isCoach || isTeamManager);

  const { data: allTeams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ["expense-teams", clubId],
    queryFn: () => base44.entities.Team.filter({ club_id: clubId }, "name"),
    enabled: !!clubId,
  });

  // Coaches: match Coach records by email to find their coach IDs.
  const { data: myCoachRecords = [] } = useQuery({
    queryKey: ["my-coach-records", user?.email],
    queryFn: () => base44.entities.Coach.filter({ email: user.email }),
    enabled: isCoach && !!user?.email,
  });

  const myCoachIds = (myCoachRecords || []).map((c) => c.id);
  const guardianId = user?.guardian_id || null;

  let teams = allTeams;
  if (isCoach) {
    teams = allTeams.filter((t) => (t.coach_ids || []).some((id) => myCoachIds.includes(id)));
  } else if (isTeamManager) {
    teams = allTeams.filter(
      (t) => guardianId && (t.team_manager_ids || []).includes(guardianId)
    );
  }

  return { teams, isScoped, isLoading: teamsLoading || (isCoach && !myCoachRecords) };
}