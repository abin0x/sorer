import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/lib/TenantContext";

// Expanded shared data source for all role dashboards — one set of queries,
// reused across all dashboard views. Each dashboard can also fetch role-specific
// data on top of this shared baseline.
//
// Multi-tenant: results are filtered client-side by the effective club id from
// TenantContext. For regular club users RLS already enforces this server-side
// (the filter is a harmless no-op); for system users viewing a specific club
// subdomain, the filter scopes the admin-bypassed list to that one tenant.
export default function useDashboardData() {
  const { effectiveClubId } = useTenant();

  const byClub = (row) => {
    if (!effectiveClubId) return true; // system user on system domain → see all
    if (row?.club_id == null) return true; // global/shared record → visible to all
    return row.club_id === effectiveClubId;
  };

  const { data: registrations = [] } = useQuery({
    queryKey: ["dash-registrations", effectiveClubId],
    queryFn: () => base44.entities.Registration.list("-created_date", 500),
  });
  const { data: players = [] } = useQuery({
    queryKey: ["dash-players", effectiveClubId],
    queryFn: () => base44.entities.Player.list("-created_date", 500),
  });
  const { data: teams = [] } = useQuery({
    queryKey: ["dash-teams", effectiveClubId],
    queryFn: () => base44.entities.Team.list("-created_date", 300),
  });
  const { data: programs = [] } = useQuery({
    queryKey: ["dash-programs", effectiveClubId],
    queryFn: () => base44.entities.Program.list("-created_date", 300),
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["dash-locations", effectiveClubId],
    queryFn: () => base44.entities.Location.list("name", 200),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["dash-expenses", effectiveClubId],
    queryFn: () => base44.entities.Expense.list("-created_date", 300),
  });
  const { data: events = [] } = useQuery({
    queryKey: ["dash-events", effectiveClubId],
    queryFn: () => base44.entities.CalendarEvent.list("start_datetime", 500),
  });
  const { data: coaches = [] } = useQuery({
    queryKey: ["dash-coaches", effectiveClubId],
    queryFn: () => base44.entities.Coach.list("last_name", 300),
  });
  const { data: guardians = [] } = useQuery({
    queryKey: ["dash-guardians", effectiveClubId],
    queryFn: () => base44.entities.Guardian.list("-created_date", 500),
  });
  const { data: facilities = [] } = useQuery({
    queryKey: ["dash-facilities", effectiveClubId],
    queryFn: () => base44.entities.Facility.list("name", 200).catch(() => []),
  });
  const { data: evaluations = [] } = useQuery({
    queryKey: ["dash-evaluations", effectiveClubId],
    queryFn: () => base44.entities.PlayerEvaluation.list("-created_date", 300).catch(() => []),
  });
  const { data: tryouts = [] } = useQuery({
    queryKey: ["dash-tryouts", effectiveClubId],
    queryFn: () => base44.entities.TryoutEvent.list("-created_date", 200).catch(() => []),
  });
  const { data: tryoutRegs = [] } = useQuery({
    queryKey: ["dash-tryout-regs", effectiveClubId],
    queryFn: () => base44.entities.TryoutRegistration.list("-created_date", 300).catch(() => []),
  });
  const { data: platforms = [] } = useQuery({
    queryKey: ["dash-platforms", effectiveClubId],
    queryFn: () => base44.entities.Platform.list("name", 100).catch(() => []),
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["dash-payments", effectiveClubId],
    queryFn: () => base44.entities.Payment.list("-created_date", 300).catch(() => []),
  });
  const { data: platformAccess = [] } = useQuery({
    queryKey: ["dash-platform-access", effectiveClubId],
    queryFn: () => base44.entities.PlatformAccess.list("-created_date", 200).catch(() => []),
  });

  return {
    registrations: registrations.filter(byClub),
    players: players.filter(byClub),
    teams: teams.filter(byClub),
    programs: programs.filter(byClub),
    locations: locations.filter(byClub),
    expenses: expenses.filter(byClub),
    events: events.filter(byClub),
    coaches: coaches.filter(byClub),
    guardians: guardians.filter(byClub),
    facilities: facilities.filter(byClub),
    evaluations: evaluations.filter(byClub),
    tryouts: tryouts.filter(byClub),
    tryoutRegs: tryoutRegs.filter(byClub),
    platforms, // global reference data — not tenant-scoped
    payments: payments.filter(byClub),
    platformAccess: platformAccess.filter(byClub),
  };
}