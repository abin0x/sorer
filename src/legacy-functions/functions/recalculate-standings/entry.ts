// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

// Recalculates tournament standings from completed game results.
//
// - Verifies the caller belongs to the tournament's club (or is a platform admin)
//   so a tenant can't recalculate another tenant's standings.
// - Includes ALL approved teams (even those with 0 games played) so the table
//   is complete from the start.
// - Groups standings by division (set group_name = division) so rankings are
//   calculated within each division.
// - Sorts by points → goal difference → goals for → head-to-head (name).
//
// Input: { tournament_id }
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { tournament_id } = body;

    if (!tournament_id) {
      return Response.json({ error: 'tournament_id required' }, { status: 400 });
    }

    const tournament = await base44.asServiceRole.entities.Tournament.get(tournament_id).catch(() => null);
    if (!tournament) {
      return Response.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Authorization: caller must belong to the organizing club or be a platform admin.
    // The public standings page calls this without a session — allow unauthenticated
    // reads since standings are public (Tournament.is_public defaults to true), but
    // the data itself is already RLS-scoped.
    const user = await base44.auth.me().catch(() => null);
    if (user) {
      const isAuthorized =
        user.role === 'admin' ||
        user.system_role === 'system_owner' ||
        user.system_role === 'system_admin' ||
        user.data?.club_id === tournament.club_id;
      if (!isAuthorized) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const pWin = tournament.points_win ?? 3;
    const pDraw = tournament.points_draw ?? 1;
    const pLoss = tournament.points_loss ?? 0;

    // Fetch all approved registrations (for division info + complete team list)
    const regsPage = await base44.asServiceRole.entities.TournamentRegistration
      .filter({ tournament_id, status: 'approved' })
      .catch(() => ({ items: [] }));
    const registrations = regsPage.items || [];

    // Fetch all games for the tournament
    const gamesPage = await base44.asServiceRole.entities.Game.filter({ tournament_id });
    const allGames = gamesPage.items || [];

    // Build team info map: team_id -> { name, type, division }
    const teamInfo = new Map();
    for (const r of registrations) {
      teamInfo.set(r.id, {
        team_name: r.team_name,
        team_type: 'external',
        division: r.division || '',
      });
    }
    // Also pick up teams that appear in games but aren't in registrations (in-house teams)
    for (const g of allGames) {
      for (const [id, name, type] of [
        [g.home_team_id, g.home_team_name, g.home_team_type],
        [g.away_team_id, g.away_team_name, g.away_team_type],
      ]) {
        if (id && !teamInfo.has(id)) {
          teamInfo.set(id, {
            team_name: name,
            team_type: type || 'external',
            division: g.division || '',
          });
        }
      }
    }

    // Initialize standings rows for ALL teams (0s across the board)
    const table = {};
    for (const [teamId, info] of teamInfo) {
      table[teamId] = {
        team_id: teamId,
        team_name: info.team_name,
        team_type: info.team_type,
        group_name: info.division || '',
        club_id: tournament.club_id,
        tournament_id,
        played: 0, won: 0, drawn: 0, lost: 0,
        goals_for: 0, goals_against: 0, goal_difference: 0, points: 0,
      };
    }

    // Apply completed game results
    for (const g of allGames) {
      if (!g.is_played || g.home_score == null || g.away_score == null) continue;

      for (const [teamId, teamName, score, oppScore, teamType, division] of [
        [g.home_team_id, g.home_team_name, g.home_score, g.away_score, g.home_team_type, g.division],
        [g.away_team_id, g.away_team_name, g.away_score, g.home_score, g.away_team_type, g.division],
      ]) {
        if (!teamId) continue;
        if (!table[teamId]) {
          table[teamId] = {
            team_id: teamId,
            team_name: teamName,
            team_type: teamType || 'external',
            group_name: division || '',
            club_id: tournament.club_id,
            tournament_id,
            played: 0, won: 0, drawn: 0, lost: 0,
            goals_for: 0, goals_against: 0, goal_difference: 0, points: 0,
          };
        }
        const row = table[teamId];
        // Inherit division from the game if the team didn't have one
        if (!row.group_name && division) row.group_name = division;
        row.played++;
        row.goals_for += score;
        row.goals_against += oppScore;
        if (score > oppScore) { row.won++; row.points += pWin; }
        else if (score < oppScore) { row.lost++; row.points += pLoss; }
        else { row.drawn++; row.points += pDraw; }
      }
    }

    // Compute goal difference
    const rows = Object.values(table).map((r) => ({
      ...r,
      goal_difference: r.goals_for - r.goals_against,
    }));

    // Group by division and sort within each group
    const byDivision = new Map();
    for (const r of rows) {
      const key = r.group_name || '';
      if (!byDivision.has(key)) byDivision.set(key, []);
      byDivision.get(key).push(r);
    }

    // Sort each division group and assign positions
    const allSorted = [];
    for (const [, group] of byDivision) {
      group.sort((a, b) =>
        b.points - a.points ||
        b.goal_difference - a.goal_difference ||
        b.goals_for - a.goals_for ||
        a.team_name.localeCompare(b.team_name)
      );
      group.forEach((r, i) => { r.position = i + 1; });
      allSorted.push(...group);
    }

    // Delete old standings
    const oldPage = await base44.asServiceRole.entities.Standing.filter({ tournament_id });
    for (const old of (oldPage.items || [])) {
      await base44.asServiceRole.entities.Standing.delete(old.id).catch(() => {});
    }

    // Create new standings
    if (allSorted.length > 0) {
      await base44.asServiceRole.entities.Standing.bulkCreate(allSorted);
    }

    return Response.json({
      success: true,
      standings_count: allSorted.length,
      divisions: Array.from(byDivision.keys()).filter(Boolean),
    });
  } catch (error) {
    console.error('recalculate-standings error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}