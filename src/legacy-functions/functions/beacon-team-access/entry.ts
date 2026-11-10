// @ts-nocheck
// beacon-team-access — resolves which teams the signed-in user may see in Beacon.
//
// Channel and ChannelMessage reads are gated on the user's locked `team_ids`
// field (club-wide channels stay open to the club). Team access comes from how
// the person is actually attached to a team: staff see every team in the club,
// branch staff see their branch, coaches their coached teams, team managers
// their managed teams, players their own team, and guardians every team their
// children play on.
//
// Writes the result with the service-role client, since app users may not edit
// that field themselves.

import { createClientFromRequest } from '@/legacy-functions/_sdk';

const ALL_TEAM_ROLES = ["master_admin", "admin", "club_director", "club_admin"];
const BRANCH_ROLES = ["branch_director", "branch_admin"];

function rows(result) {
  return Array.isArray(result) ? result : result?.items || [];
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const svc = base44.asServiceRole;
    const clubId = user.club_id;
    if (!clubId) {
      // No club membership — clear any access left over from a previous club.
      const old = rows(await svc.entities.BeaconTeamAccess.filter({ user_id: user.id }));
      for (const r of old) await svc.entities.BeaconTeamAccess.update(r.id, { team_ids: [] });
      return Response.json({ team_ids: [] });
    }

    const role = user.custom_role || user.role;
    const teams = rows(await svc.entities.Team.filter({ club_id: clubId }, "-created_date", 500));
    let teamIds = [];

    if (ALL_TEAM_ROLES.includes(role)) {
      teamIds = teams.map((t) => t.id);
    } else if (BRANCH_ROLES.includes(role)) {
      const branchId = user.branch_id || user.location_id;
      const branchTeams = branchId ? teams.filter((t) => t.location_id === branchId) : [];
      teamIds = (branchTeams.length ? branchTeams : teams).map((t) => t.id);
    } else if (role === "coach") {
      const coaches = rows(await svc.entities.Coach.filter({ club_id: clubId, email: user.email }));
      const coachIds = new Set(coaches.map((c) => c.id));
      teamIds = teams
        .filter((t) => {
          const ids = t.coach_ids?.length ? t.coach_ids : [t.coach_id].filter(Boolean);
          return ids.some((id) => coachIds.has(id));
        })
        .map((t) => t.id);
    } else if (role === "team_manager") {
      teamIds = teams
        .filter((t) => {
          const ids = t.team_manager_ids?.length ? t.team_manager_ids : [t.team_manager_id].filter(Boolean);
          return ids.includes(user.id);
        })
        .map((t) => t.id);
    } else if (role === "player") {
      if (user.player_id) {
        const player = await svc.entities.Player.get(user.player_id).catch(() => null);
        if (player?.team_id) teamIds = [player.team_id];
      }
    } else if (role === "parent_guardian") {
      const guardians = rows(await svc.entities.Guardian.filter({ club_id: clubId, email: user.email }));
      const guardian = guardians[0] || (user.guardian_id ? await svc.entities.Guardian.get(user.guardian_id).catch(() => null) : null);
      if (guardian) {
        const guardianIds = new Set([guardian.id, user.guardian_id].filter(Boolean));
        const players = rows(await svc.entities.Player.filter({ club_id: clubId }, "-created_date", 2000));
        teamIds = players
          .filter((p) => {
            const ids = p.guardian_ids?.length ? p.guardian_ids : [p.guardian_id].filter(Boolean);
            return ids.some((id) => guardianIds.has(id));
          })
          .map((p) => p.team_id)
          .filter(Boolean);
      }
    }

    const unique = [...new Set(teamIds)];
    // Stored in beacon_team_accesses, which the channel read rules check.
    const existing = rows(await svc.entities.BeaconTeamAccess.filter({ user_id: user.id }))[0];
    if (existing) await svc.entities.BeaconTeamAccess.update(existing.id, { club_id: clubId, team_ids: unique });
    else await svc.entities.BeaconTeamAccess.create({ user_id: user.id, club_id: clubId, team_ids: unique });
    return Response.json({ team_ids: unique, role });
  } catch (error) {
    console.error("beacon-team-access error:", error);
    return Response.json({ error: error.message || "Unable to resolve team access" }, { status: 500 });
  }
}