// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import {
  generateRoundRobin,
  generateDivisionRoundRobin,
  detectConflicts,
  assignSlotsCoachAware,
  minToTime,
  timeToMin,
  type ProposedGame,
  type ScheduleConflict,
  type FieldInfo,
} from "../../shared/tournamentScheduling.ts";
import { buildTravelMatrix, type FacilityLocation } from "../../shared/travelTime.ts";
import { loadClubGoogleMapsKey } from "../../shared/clubCredentialsAccess.ts";

// Generates a round-robin schedule for a tournament.
//
// Coach-aware scheduling (default): prioritizes assigning a coach's multiple
// teams to the same or adjacent fields, and ensures enough buffer time
// (travel + parking) between a coach's consecutive games at different
// facilities. Travel times are computed via Google Maps Distance Matrix API
// (if GOOGLE_MAPS_API_KEY is set) or InvokeLLM with web context as fallback.
//
// Input:
//   tournament_id
//   team_ids: string[]
//   fields: { field_id, field_name, facility_name }[]
//   dates: string[]
//   start_time: string (e.g. "8:00 AM")
//   game_duration_min: number (default 80)
//   gap_min: number (default 20)
//   referees: { referee_id, referee_name }[] (optional)
//   schedule_by_division: boolean
//   team_divisions: Record<string, string>
//   coach_aware: boolean (default true)
//   parking_min: number (default 10)
//
// Auth: admin/scheduler only. Creates Game records and returns the schedule + conflicts.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      tournament_id,
      team_ids,
      fields,
      dates,
      start_time,
      game_duration_min,
      gap_min,
      referees,
      schedule_by_division,
      team_divisions,
      parking_min,
      coach_aware,
    } = body;

    if (!tournament_id)
      return Response.json({ error: "Missing tournament_id" }, { status: 400 });
    if (!Array.isArray(team_ids) || team_ids.length < 2)
      return Response.json({ error: "Need at least 2 teams" }, { status: 400 });
    if (!Array.isArray(fields) || fields.length === 0)
      return Response.json({ error: "Need at least 1 field" }, { status: 400 });
    if (!Array.isArray(dates) || dates.length === 0)
      return Response.json({ error: "Need at least 1 date" }, { status: 400 });

    const svc = base44.asServiceRole;
    const tournament = await svc.entities.Tournament.get(tournament_id).catch(() => null);
    if (!tournament)
      return Response.json({ error: "Tournament not found" }, { status: 404 });

    const isAuthorized =
      user.role === "admin" ||
      user.system_role === "system_owner" ||
      user.system_role === "system_admin" ||
      user.data?.club_id === tournament.club_id;
    if (!isAuthorized)
      return Response.json({ error: "Forbidden" }, { status: 403 });

    const toArray = (r: any) => (Array.isArray(r) ? r : r?.items || []);
    const teamSet = new Set(team_ids);
    const cleanDates = dates.filter(Boolean);

    // Fetch teams, registrations, fields, and facilities in parallel
    const [teamsPage, regsPage, fieldsPage, facilitiesPage] = await Promise.all([
      svc.entities.Team.filter({ club_id: tournament.club_id }, { limit: 500 }).catch(() => []),
      svc.entities.TournamentRegistration.filter({ tournament_id }, { limit: 500 }).catch(() => []),
      svc.entities.Field.filter({ club_id: tournament.club_id }, { limit: 500 }).catch(() => []),
      svc.entities.Facility.filter({ club_id: tournament.club_id }, { limit: 500 }).catch(() => []),
    ]);

    // Build team name, coach, and type maps
    const teamNames = new Map<string, string>();
    const teamCoaches = new Map<string, string>();
    const teamTypes = new Map<string, string>();
    for (const t of toArray(teamsPage)) {
      if (teamSet.has(t.id)) {
        teamNames.set(t.id, t.name);
        teamTypes.set(t.id, "internal");
        const coach = t.coach_name || (Array.isArray(t.coach_names) && t.coach_names[0]) || "";
        teamCoaches.set(t.id, coach);
      }
    }
    for (const r of toArray(regsPage)) {
      if (teamSet.has(r.id)) {
        teamNames.set(r.id, r.team_name);
        teamTypes.set(r.id, "external");
        teamCoaches.set(r.id, r.coach_name || "");
      }
    }

    // Division map: explicit param overrides, then fall back to registration division
    const divMap: Record<string, string> = {};
    for (const id of team_ids) {
      divMap[id] = (team_divisions && team_divisions[id]) || toArray(regsPage).find((r: any) => r.id === id)?.division || "";
    }

    // Build field info with facility linkage
    const fieldEntities = toArray(fieldsPage);
    const facilityEntities = toArray(facilitiesPage);
    const facilityMap = new Map(facilityEntities.map((f: any) => [f.id, f]));
    const fieldInfos: FieldInfo[] = fields.map((f: any) => {
      const fe = fieldEntities.find((e: any) => e.id === f.field_id);
      const facilityId = fe?.facility_id || "";
      const fac = facilityMap.get(facilityId);
      return {
        field_id: f.field_id,
        field_name: f.field_name || fe?.name || "",
        facility_id: facilityId,
        facility_name: f.facility_name || fac?.name || fe?.facility_name || "",
      };
    });

    // Build travel matrix between facilities
    const useCoachAware = coach_aware !== false;
    const parkingMin = parking_min || 10;
    let travelMatrix: Record<string, number> = {};

    if (useCoachAware) {
      const facilityLocations: FacilityLocation[] = [...new Set(fieldInfos.map((f) => f.facility_id).filter(Boolean))]
        .map((id) => {
          const fac = facilityMap.get(id);
          return { id, name: fac?.name || id, address: fac?.address || "" };
        })
        .filter((f) => f.address);

      if (facilityLocations.length > 0) {
        const gmapsKey = await loadClubGoogleMapsKey(svc, tournament.club_id);
        travelMatrix = await buildTravelMatrix(
          facilityLocations,
          (params: any) => base44.integrations.Core.InvokeLLM(params),
          gmapsKey
        );
      }
    }

    // Generate matchups — division-based or flat round-robin
    const useDivisions = !!schedule_by_division;
    const divRounds = useDivisions ? generateDivisionRoundRobin(team_ids, divMap) : null;
    const flatRounds = !useDivisions ? generateRoundRobin(team_ids) : null;

    const matchups: { home: string; away: string; round: number; division?: string }[] = [];
    if (divRounds) {
      for (const round of divRounds)
        for (const m of round.matches)
          matchups.push({ home: m.home, away: m.away, round: round.round, division: round.division });
    } else if (flatRounds) {
      for (const round of flatRounds)
        for (const m of round.matches)
          matchups.push({ home: m.home, away: m.away, round: round.round });
    }

    const duration = game_duration_min || 80;
    const gap = gap_min || 20;
    const firstKickoff = timeToMin(start_time || "8:00 AM");
    const refList = Array.isArray(referees) ? referees : [];

    // Assign slots: coach-aware or sequential fallback
    let proposed: ProposedGame[];
    if (useCoachAware) {
      proposed = assignSlotsCoachAware({
        matchups,
        fields: fieldInfos,
        teamNames,
        teamCoaches,
        dates: cleanDates,
        firstKickoff,
        duration,
        gap,
        travelMatrix,
        parkingMin,
        referees: refList,
      });
    } else {
      proposed = [];
      let gameNumber = 0;
      let dateIdx = 0;
      let slotIdx = 0;
      for (const match of matchups) {
        const home = teamNames.get(match.home);
        const away = teamNames.get(match.away);
        if (!home || !away) continue;
        let kickoff = firstKickoff + slotIdx * (duration + gap);
        while (kickoff + duration > 1320 && dateIdx < cleanDates.length * 10) {
          slotIdx = 0;
          dateIdx++;
          kickoff = firstKickoff + slotIdx * (duration + gap);
        }
        const field = fieldInfos[slotIdx % fieldInfos.length];
        const date = cleanDates[dateIdx % cleanDates.length];
        const ref = refList.length > 0 ? refList[gameNumber % refList.length] : null;
        proposed.push({
          field_id: field.field_id,
          field_name: field.field_name,
          facility_id: field.facility_id,
          facility_name: field.facility_name,
          scheduled_date: date,
          start_min: kickoff,
          end_min: kickoff + duration,
          home_team_id: match.home,
          home_team_name: home,
          away_team_id: match.away,
          away_team_name: away,
          home_coach_name: teamCoaches.get(match.home) || "",
          away_coach_name: teamCoaches.get(match.away) || "",
          referee_id: ref?.referee_id,
          referee_name: ref?.referee_name,
          round: match.division ? `${match.division} - Round ${match.round}` : `Round ${match.round}`,
          round_number: match.round,
          game_number: gameNumber + 1,
          division: match.division || "",
        });
        gameNumber++;
        slotIdx++;
      }
    }

    // Detect conflicts (travel-aware when coach-aware is on)
    const conflicts: ScheduleConflict[] = detectConflicts(proposed, 60, travelMatrix, parkingMin);

    // Persist games
    const created: any[] = [];
    for (const g of proposed) {
      const game = await svc.entities.Game.create({
        club_id: tournament.club_id,
        tournament_id,
        round: g.round,
        round_number: g.round_number,
        game_number: g.game_number,
        home_team_id: g.home_team_id,
        home_team_name: g.home_team_name,
        home_team_type: teamTypes.get(g.home_team_id) || "external",
        home_coach_name: g.home_coach_name || "",
        away_team_id: g.away_team_id,
        away_team_name: g.away_team_name,
        away_team_type: teamTypes.get(g.away_team_id) || "external",
        away_coach_name: g.away_coach_name || "",
        field_id: g.field_id,
        facility_id: g.facility_id || "",
        field_name: g.field_name,
        facility_name: g.facility_name || fieldInfos.find((f) => f.field_id === g.field_id)?.facility_name || "",
        scheduled_date: g.scheduled_date,
        start_min: g.start_min,
        end_min: g.end_min,
        start_time: minToTime(g.start_min),
        end_time: minToTime(g.end_min),
        referee_id: g.referee_id || undefined,
        referee_name: g.referee_name || "",
        division: g.division || "",
        status: "scheduled",
        is_played: false,
      });
      created.push(game);
    }

    const totalRounds = divRounds
      ? new Set(divRounds.map((r) => r.division)).size * Math.max(...divRounds.map((r) => r.round), 0)
      : flatRounds?.length || 0;

    return Response.json({
      games_created: created.length,
      rounds: totalRounds,
      conflicts,
      conflict_count: conflicts.length,
      division_based: useDivisions,
      coach_aware: useCoachAware,
    });
  } catch (error) {
    console.error("generate-tournament-schedule error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}