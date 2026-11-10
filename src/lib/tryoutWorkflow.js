export const TRYOUT_PHASES = [
  { id: "setup", label: "Setup & team dues", tabs: ["matrix", "plans", "approvals"] },
  { id: "day", label: "Players & tryout day", tabs: ["players", "sessions", "checkin", "evaluation"] },
  { id: "placement", label: "Rosters & offers", tabs: ["rosters", "offers"] },
];

export function teamPlanForTeam(teamPlans, teamId, clubId) {
  return teamPlans.filter((p) => p.club_id === clubId && p.team_id === teamId && !p.is_template)
    .sort((a, b) => Number(b.status === "active") - Number(a.status === "active") || String(b.created_date || "").localeCompare(String(a.created_date || "")))[0] || null;
}

export function tryoutSetupChecklist({ plans, events, teamPlans, clubId }) {
  const scopedPlans = plans.filter((p) => p.club_id === clubId);
  const ids = new Set(scopedPlans.map((p) => p.id));
  const teamIds = [...new Set(scopedPlans.flatMap((p) => p.team_ids || []))];
  const mainDates = scopedPlans.filter((p) => events.some((e) => e.tryout_plan_id === p.id && e.club_id === clubId && e.type === "main_tryout")).length;
  const linked = scopedPlans.filter((p) => p.team_ids?.length).length;
  const ready = teamIds.filter((id) => teamPlanForTeam(teamPlans, id, clubId)?.status === "active").length;
  return [
    { key: "tryouts", label: "Create your tryout groups", detail: `${scopedPlans.length} tryout groups`, done: ids.size > 0, tab: "matrix" },
    { key: "dates", label: "Schedule main tryout dates", detail: `${mainDates} of ${scopedPlans.length} groups scheduled`, done: ids.size > 0 && mainDates === ids.size, tab: "sessions" },
    { key: "teams", label: "Link teams to each tryout", detail: `${linked} of ${scopedPlans.length} groups have teams`, done: ids.size > 0 && linked === ids.size, tab: "matrix" },
    { key: "dues", label: "Set team dues & included services", detail: `${ready} of ${teamIds.length} teams have active plans`, done: teamIds.length > 0 && ready === teamIds.length, tab: "rosters" },
  ];
}

export function resolveTeamPlanTeamId(form, teams, clubId) {
  const scoped = teams.filter((t) => t.club_id === clubId);
  if (form.team_id) {
    if (!scoped.some((t) => t.id === form.team_id)) throw new Error("Selected team does not belong to this club.");
    return form.team_id;
  }
  const matches = scoped.filter((t) => t.name === form.team_name);
  if (matches.length > 1) throw new Error("More than one team has this name. Open the plan from the team's roster card.");
  return matches[0]?.id;
}