// Season Lifecycle — 10 phases from the Club Rudder build guide, computed per
// scope (whole club, or any set of branches).

export const PHASE_KEYS = [
  "rollover", "matrix", "team_plans", "tryout_plan", "registration",
  "promotion", "tryout_day", "rosters", "offers", "switch",
];

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Which season holds the lifecycle settings: the Preparing one, else current, else newest. */
export function pickLifecycleSeason(seasons = []) {
  return seasons.find((s) => s.status === "preparing")
    || seasons.find((s) => s.status === "draft")
    || seasons.find((s) => s.is_current)
    || seasons[0]
    || null;
}

/** Club Admin scope: which branches the admin runs; the rest belong to branch leads. */
export function resolveScope(season, locations = []) {
  const allIds = locations.map((l) => l.id);
  const byBranch = season?.lifecycle_scope === "branches";
  const adminIds = byBranch
    ? new Set((season.admin_branch_ids || []).filter((id) => allIds.includes(id)))
    : new Set(allIds);
  return { mode: byBranch ? "branches" : "club", adminIds, isAll: adminIds.size === allIds.length };
}

export const ownerOf = (scope, branchId) => (scope.adminIds.has(branchId) ? "club_admin" : "branch_leads");

/** Narrow lifecycle data to a set of branch ids. Unassigned teams only count for a club-wide scope. */
export function scopeDataToBranches(data, branchIds, includeUnassigned = false) {
  if (includeUnassigned) return data;
  const inB = (id) => id != null && branchIds.has(id);
  const teams = (data.teams || []).filter((t) => inB(t.location_id));
  const teamIds = new Set(teams.map((t) => t.id));
  const planIds = new Set(teams.map((t) => t.team_plan_id).filter(Boolean));
  const tryoutPlans = (data.tryoutPlans || []).filter((p) => (p.team_ids || []).some((id) => teamIds.has(id)));
  const tpIds = new Set(tryoutPlans.map((p) => p.id));
  const tryouts = (data.tryouts || []).filter((e) => tpIds.has(e.tryout_plan_id));
  const evIds = new Set(tryouts.map((e) => e.id));
  return {
    ...data,
    teams,
    players: (data.players || []).filter((p) => inB(p.location_id)),
    teamPlans: (data.teamPlans || []).filter((p) => planIds.has(p.id)),
    tryoutPlans,
    tryouts,
    tryoutRegs: (data.tryoutRegs || []).filter((r) => evIds.has(r.tryout_event_id)),
    finalRegs: (data.finalRegs || []).filter((f) => teamIds.has(f.team_id)),
  };
}

const rate = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

/** Compute the 10 lifecycle phases: [{ key, label, status, detail, to, actionLabel }] */
export function computePhases(data, seasonOverride) {
  const {
    seasons = [], ageGroups = [], tryoutPlans = [], tryouts = [], tryoutRegs = [],
    teams = [], players = [], finalRegs = [], teamPlans = [], posts = [],
  } = data;
  const season = seasonOverride || pickLifecycleSeason(seasons);
  const current = seasonOverride || seasons.find((s) => s.is_current) || season;

  const s1 = {
    key: "rollover", label: "Season & Rollover",
    status: season ? "done" : "pending",
    detail: season ? `${season.name} ${season.status === "preparing" || season.status === "draft" ? "preparing" : "active"}` : "No season created",
    to: "/Seasons", actionLabel: "Roll Over",
  };

  const seasonAges = current ? ageGroups.filter((a) => a.season_id === current.id) : [];
  const s2 = {
    key: "matrix", label: "Team Matrix",
    status: seasonAges.length > 0 ? "done" : "pending",
    detail: seasonAges.length > 0 ? `${seasonAges.length} age groups configured` : "No matrix set up",
    to: "/Seasons", actionLabel: "Configure Matrix",
  };

  const withPlan = teams.filter((t) => teamPlans.find((p) => p.id === t.team_plan_id)?.status === "active");
  const s3 = {
    key: "team_plans", label: "Team Plans",
    status: teams.length === 0 ? "pending" : withPlan.length === teams.length ? "done" : withPlan.length > 0 ? "in_progress" : "pending",
    detail: teams.length === 0 ? "No teams yet" : `${withPlan.length}/${teams.length} teams have an approved plan`,
    to: "/TryoutDashboard?tab=plans", actionLabel: "Assign Plans",
  };

  const planHasAnchor = (p) => tryouts.some((e) => e.tryout_plan_id === p.id && (e.is_anchor || e.type === "main_tryout"));
  const covered = teams.filter((t) =>
    tryoutPlans.some((p) => ((p.team_ids || []).length === 0 || p.team_ids.includes(t.id)) && planHasAnchor(p)));
  const s4 = {
    key: "tryout_plan", label: "Tryout Planning",
    status: teams.length === 0 ? "pending" : covered.length === teams.length ? "done" : covered.length > 0 || tryoutPlans.length > 0 ? "in_progress" : "pending",
    detail: teams.length === 0 ? "No teams yet" : `${covered.length}/${teams.length} teams have a scheduled main tryout`,
    to: "/TryoutDashboard", actionLabel: "Plan Tryouts",
  };

  const mains = tryouts.filter((e) => e.type === "main_tryout");
  const live = mains.some((e) => e.registration_count > 0 || e.registration_url || e.auto_registration);
  const s5 = {
    key: "registration", label: "Tryout Registration",
    status: live ? "done" : mains.length > 0 ? "in_progress" : "pending",
    detail: live ? `Open · ${tryoutRegs.length} registered` : mains.length > 0 ? "Registration pages not live" : "No sessions yet",
    to: "/TryoutDashboard", actionLabel: "Open Registration",
  };

  const tryoutPosts = posts.filter((p) => p.source_type === "tryout" || p.event_type === "tryout");
  const sent = tryoutPosts.filter((p) => p.status === "published" || p.status === "scheduled");
  const s6 = {
    key: "promotion", label: "Promotion",
    status: sent.length > 0 ? "done" : tryoutPosts.length > 0 ? "in_progress" : "pending",
    detail: sent.length > 0 ? `${sent.length} campaign posts scheduled/sent (club-wide)` : tryoutPosts.length > 0 ? "Drafts only (club-wide)" : "No campaigns yet (club-wide)",
    to: "/Marketing", actionLabel: "Promote Tryouts",
  };

  const held = tryouts.filter((e) => e.date && e.date <= todayISO());
  const evaluated = held.filter((e) => (e.evaluated_count || 0) > 0);
  const s7 = {
    key: "tryout_day", label: "Tryout Day",
    status: held.length === 0 ? "pending" : evaluated.length === held.length ? "done" : "in_progress",
    detail: held.length === 0 ? "No sessions held yet" : `${evaluated.length}/${held.length} sessions evaluated`,
    to: "/TryoutDashboard", actionLabel: "Open Sessions",
  };

  const cap = teams.reduce((s, t) => s + (t.max_roster_size || 18), 0);
  const filled = teams.reduce((s, t) => s + (t.player_ids || []).length, 0);
  const fill = rate(filled, cap);
  const s8 = {
    key: "rosters", label: "Roster Selection",
    status: filled === 0 ? "pending" : fill >= 80 ? "done" : "in_progress",
    detail: `${filled}/${cap} roster slots filled (${fill}%) · ${players.filter((p) => !p.team_id).length} unplaced`,
    to: "/Registration?tab=teams", actionLabel: "View Rosters",
  };

  const done = finalRegs.filter((f) => f.status === "submitted" || f.status === "paid");
  const s9 = {
    key: "offers", label: "Offers & Registration",
    status: finalRegs.length === 0 ? "pending" : done.length === finalRegs.length ? "done" : "in_progress",
    detail: finalRegs.length === 0 ? "No offers sent" : `${done.length}/${finalRegs.length} fully registered`,
    to: "/TryoutDashboard", actionLabel: "Send Offers",
  };

  const before = [s1, s2, s3, s4, s5, s6, s7, s8, s9];
  const ready = before.every((s) => s.status === "done");
  const s10 = {
    key: "switch", label: "Season Switch",
    status: ready ? "in_progress" : "pending",
    detail: ready ? "Ready for pre-flight review (club-wide)" : "Waiting on earlier phases (club-wide)",
    to: "/Seasons", actionLabel: "Review Switch",
  };

  return [...before, s10];
}

export const percentDone = (steps) =>
  steps.length ? Math.round((steps.filter((s) => s.status === "done").length / steps.length) * 100) : 0;