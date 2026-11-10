// Season Command Center readiness rules — one row of computed status per team.
// Severity: "blocked" (red) > "warning" (amber) > "ready" (green).
export function computeTeamReadiness(team, { teamPlans = [], tryoutPlans = [], tryoutEvents = [], finalRegs = [] } = {}) {
  const reasons = [];
  let severity = "ready";

  const bump = (level, reason) => {
    reasons.push(reason);
    if (level === "blocked") severity = "blocked";
    else if (level === "warning" && severity !== "blocked") severity = "warning";
  };

  const hasCoach = !!team.coach_id || (team.coach_ids || []).length > 0;
  if (!hasCoach) bump("blocked", "No coach assigned");

  if (!team.location_id) bump("warning", "No venue/branch assigned");

  const plan = teamPlans.find((p) => p.id === team.team_plan_id);
  const hasActivePlan = plan?.status === "active";
  if (!plan) bump("warning", "No team plan assigned");
  else if (!hasActivePlan) bump("warning", `Plan "${plan.template_name || plan.team_name}" is ${plan.status}, not active`);

  const tryoutPlan = tryoutPlans.find((p) => (p.team_ids || []).includes(team.id));
  const anchorEvent = tryoutPlan ? tryoutEvents.find((e) => e.tryout_plan_id === tryoutPlan.id && e.is_anchor) : null;
  if (!tryoutPlan || !anchorEvent) bump("warning", "No tryout events scheduled");

  const rosterCount = (team.player_ids || []).length;
  const cap = team.max_roster_size || 0;
  if (rosterCount === 0) bump("warning", "No players rostered yet");

  const teamFinalRegs = finalRegs.filter((r) => r.team_id === team.id);
  const invitesSent = teamFinalRegs.length;
  const paidCount = teamFinalRegs.filter((r) => r.status === "paid").length;

  return {
    teamId: team.id,
    severity,
    reasons,
    hasCoach,
    hasVenue: !!team.location_id,
    plan,
    hasActivePlan,
    tryoutPlan,
    anchorEvent,
    rosterCount,
    cap,
    invitesSent,
    paidCount,
  };
}

export function computeSeasonOverview(teams, context) {
  const rows = teams.map((t) => computeTeamReadiness(t, context));
  return {
    rows,
    totalTeams: teams.length,
    teamsWithPlan: rows.filter((r) => r.hasActivePlan).length,
    tryoutsScheduled: rows.filter((r) => r.anchorEvent).length,
    rostersStarted: rows.filter((r) => r.rosterCount > 0).length,
    invitesSent: rows.reduce((s, r) => s + r.invitesSent, 0),
    registrationsPaid: rows.reduce((s, r) => s + r.paidCount, 0),
    blockedTeams: rows.filter((r) => r.severity === "blocked"),
    warningTeams: rows.filter((r) => r.severity === "warning"),
    readyTeams: rows.filter((r) => r.severity === "ready"),
  };
}

// Hard gate used before sending final registration invites: every team with
// at least one pending (about-to-be-invited) player must have an ACTIVE plan.
export function teamsBlockingFinalInvites(pendingPlayers, teams, teamPlans) {
  const teamIds = [...new Set(pendingPlayers.map((p) => p.team_id).filter(Boolean))];
  const blocked = [];
  for (const teamId of teamIds) {
    const team = teams.find((t) => t.id === teamId);
    if (!team) continue;
    const plan = teamPlans.find((p) => p.id === team.team_plan_id);
    if (!plan || plan.status !== "active") blocked.push(team);
  }
  return blocked;
}