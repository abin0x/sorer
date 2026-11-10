export function computePlayerAttendance(playerId, events, teamId) {
  const teamEvents = events.filter((e) => (e.team_ids || []).includes(teamId));
  const practices = teamEvents.filter((e) => e.event_type === "practice");
  const games = teamEvents.filter((e) => e.event_type === "game");
  const practiceAttending = practices.filter((e) => e.rsvps?.[playerId] === "attending").length;
  const gameAttending = games.filter((e) => e.rsvps?.[playerId] === "attending").length;
  return {
    trainingPct: practices.length > 0 ? Math.round((practiceAttending / practices.length) * 100) : 0,
    gamePct: games.length > 0 ? Math.round((gameAttending / games.length) * 100) : 0,
    overallPct: teamEvents.length > 0 ? Math.round(((practiceAttending + gameAttending) / teamEvents.length) * 100) : 0,
  };
}

export function computeTeamAttendance(team, players, events) {
  const teamPlayers = players.filter((p) => p.team_id === team.id);
  if (teamPlayers.length === 0) return { trainingPct: 0, gamePct: 0, overallPct: 0, playerCount: 0 };
  let trainSum = 0, gameSum = 0, overallSum = 0;
  for (const p of teamPlayers) {
    const a = computePlayerAttendance(p.id, events, team.id);
    trainSum += a.trainingPct; gameSum += a.gamePct; overallSum += a.overallPct;
  }
  return {
    trainingPct: Math.round(trainSum / teamPlayers.length),
    gamePct: Math.round(gameSum / teamPlayers.length),
    overallPct: Math.round(overallSum / teamPlayers.length),
    playerCount: teamPlayers.length,
  };
}

export function computePlatformAttendance(teams, players, events) {
  if (teams.length === 0) return { trainingPct: 0, gamePct: 0, overallPct: 0 };
  let trainSum = 0, gameSum = 0, overallSum = 0;
  for (const t of teams) {
    const a = computeTeamAttendance(t, players, events);
    trainSum += a.trainingPct; gameSum += a.gamePct; overallSum += a.overallPct;
  }
  return {
    trainingPct: Math.round(trainSum / teams.length),
    gamePct: Math.round(gameSum / teams.length),
    overallPct: Math.round(overallSum / teams.length),
  };
}