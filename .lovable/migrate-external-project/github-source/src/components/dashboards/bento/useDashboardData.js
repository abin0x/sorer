import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/lib/TenantContext";

// Shared data source for all bento-box role dashboards — one set of queries,
// reused across Club Director, Club Admin, Bookkeeper, and Branch Director views.
// Multi-tenant: filtered by the effective club id from TenantContext.
export default function useDashboardData() {
  const { effectiveClubId } = useTenant();

  const byClub = (row) => {
    if (!effectiveClubId) return true;
    if (row?.club_id == null) return true;
    return row.club_id === effectiveClubId;
  };

  const { data: registrations = [] } = useQuery({
    queryKey: ["bento-registrations", effectiveClubId],
    queryFn: () => base44.entities.Registration.list("-created_date", 300),
  });
  const { data: players = [] } = useQuery({
    queryKey: ["bento-players", effectiveClubId],
    queryFn: () => base44.entities.Player.list("-created_date", 300),
  });
  const { data: teams = [] } = useQuery({
    queryKey: ["bento-teams", effectiveClubId],
    queryFn: () => base44.entities.Team.list("-created_date", 150),
  });
  const { data: programs = [] } = useQuery({
    queryKey: ["bento-programs", effectiveClubId],
    queryFn: () => base44.entities.Program.list("-created_date", 150),
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["bento-locations", effectiveClubId],
    queryFn: () => base44.entities.Location.list("name", 100),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["bento-expenses", effectiveClubId],
    queryFn: () => base44.entities.Expense.list("-created_date", 150),
  });
  return {
    registrations: registrations.filter(byClub),
    players: players.filter(byClub),
    teams: teams.filter(byClub),
    programs: programs.filter(byClub),
    locations: locations.filter(byClub),
    expenses: expenses.filter(byClub),
  };
}