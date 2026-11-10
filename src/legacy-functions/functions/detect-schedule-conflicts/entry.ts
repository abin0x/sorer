// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import {
  detectConflicts,
  type ProposedGame,
} from "../../shared/tournamentScheduling.ts";
import { buildTravelMatrix, type FacilityLocation } from "../../shared/travelTime.ts";
import { loadClubGoogleMapsKey } from "../../shared/clubCredentialsAccess.ts";

// Validates a set of proposed or existing games for scheduling conflicts.
//
// Checks: field double-booking, team double-booking, referee double-booking,
// coach double-booking, insufficient rest, and insufficient travel time
// (coach with back-to-back games at different facilities without enough
// travel + parking buffer).
//
// Auth: any authenticated user may run conflict detection (read-only analysis).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { games, tournament_id, min_rest_minutes, parking_min } = body;
    const parkingMin = parking_min || 10;

    let proposed: ProposedGame[] = [];
    let travelMatrix: Record<string, number> = {};

    if (Array.isArray(games) && games.length > 0) {
      proposed = games as ProposedGame[];
    } else if (tournament_id) {
      const svc = base44.asServiceRole;
      const page = await svc.entities.Game.filter(
        { tournament_id },
        { sort: "scheduled_date" }
      );
      const gamesList = page.items;

      // Resolve coach names: prefer stored Game fields, fall back to entity lookup
      const teamIds = new Set<string>();
      for (const g of gamesList) {
        if (!g.home_coach_name && g.home_team_id) teamIds.add(g.home_team_id);
        if (!g.away_coach_name && g.away_team_id) teamIds.add(g.away_team_id);
      }
      const idArr = [...teamIds];
      const coachMap = new Map<string, string>();
      if (idArr.length > 0) {
        const [regsPage, teamsPage] = await Promise.all([
          svc.entities.TournamentRegistration
            .filter({ id: { $in: idArr } })
            .catch(() => ({ items: [] })),
          svc.entities.Team
            .filter({ id: { $in: idArr } })
            .catch(() => ({ items: [] })),
        ]);
        for (const r of regsPage.items || [])
          coachMap.set(r.id, r.coach_name || "");
        for (const t of teamsPage.items || [])
          coachMap.set(t.id, t.coach_name || (Array.isArray(t.coach_names) && t.coach_names[0]) || "");
      }

      // Resolve facility_ids: prefer stored Game.facility_id, fall back to Field lookup
      const fieldIds = new Set<string>();
      for (const g of gamesList) {
        if (!g.facility_id && g.field_id) fieldIds.add(g.field_id);
      }
      const fieldFacilityMap = new Map<string, string>();
      if (fieldIds.size > 0) {
        const fieldsPage = await svc.entities.Field
          .filter({ id: { $in: [...fieldIds] } })
          .catch(() => ({ items: [] }));
        for (const f of fieldsPage.items || [])
          fieldFacilityMap.set(f.id, f.facility_id || "");
      }

      proposed = gamesList.map((g: any) => ({
        id: g.id,
        field_id: g.field_id || "",
        field_name: g.field_name || "",
        facility_id: g.facility_id || fieldFacilityMap.get(g.field_id) || "",
        facility_name: g.facility_name || "",
        scheduled_date: g.scheduled_date,
        start_min: g.start_min,
        end_min: g.end_min,
        home_team_id: g.home_team_id || "",
        home_team_name: g.home_team_name || "",
        home_coach_name: g.home_coach_name || coachMap.get(g.home_team_id) || "",
        away_team_id: g.away_team_id || "",
        away_team_name: g.away_team_name || "",
        away_coach_name: g.away_coach_name || coachMap.get(g.away_team_id) || "",
        referee_id: g.referee_id || undefined,
        referee_name: g.referee_name || "",
      }));

      // Build travel matrix between facilities used in this tournament
      const facilityIds = [...new Set(proposed.map((g) => g.facility_id).filter(Boolean))];
      if (facilityIds.length > 1) {
        const facilitiesPage = await svc.entities.Facility
          .filter({ id: { $in: facilityIds } })
          .catch(() => ({ items: [] }));
        const facilityLocations: FacilityLocation[] = (facilitiesPage.items || [])
          .map((f: any) => ({ id: f.id, name: f.name, address: f.address || "" }))
          .filter((f: FacilityLocation) => f.address);
        if (facilityLocations.length > 0) {
          // Resolve club_id from the tournament for per-tenant Google Maps key
          const tournament = await svc.entities.Tournament.get(tournament_id).catch(() => null);
          const gmapsKey = tournament
            ? await loadClubGoogleMapsKey(svc, tournament.club_id)
            : undefined;
          travelMatrix = await buildTravelMatrix(
            facilityLocations,
            (params: any) => base44.integrations.Core.InvokeLLM(params),
            gmapsKey
          );
        }
      }
    } else {
      return Response.json(
        { error: "Provide either 'games' array or 'tournament_id'" },
        { status: 400 }
      );
    }

    const conflicts = detectConflicts(proposed, min_rest_minutes || 60, travelMatrix, parkingMin);
    return Response.json({
      conflict_count: conflicts.length,
      error_count: conflicts.filter((c) => c.severity === "error").length,
      warning_count: conflicts.filter((c) => c.severity === "warning").length,
      conflicts,
    });
  } catch (error) {
    console.error("detect-schedule-conflicts error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}