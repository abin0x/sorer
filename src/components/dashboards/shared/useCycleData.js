import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import { computePhases, pickLifecycleSeason } from "@/lib/seasonLifecycle";

/**
 * Fetches cycle-specific entities (Seasons, AgeGroups, TryoutPlans,
 * TryoutFinalRegistrations) that supplement the shared useDashboardData baseline.
 * All results are tenant-filtered client-side.
 */
export default function useCycleData() {
  const { effectiveClubId } = useTenant();
  const byClub = (row) => {
    if (!effectiveClubId) return true;
    if (row?.club_id == null) return true;
    return row.club_id === effectiveClubId;
  };

  const { data: seasons = [] } = useQuery({
    queryKey: ["cycle-seasons", effectiveClubId],
    queryFn: () => base44.entities.Season.list("-created_date", 50).catch(() => []),
  });
  const { data: ageGroups = [] } = useQuery({
    queryKey: ["cycle-age-groups", effectiveClubId],
    queryFn: () => base44.entities.AgeGroup.list("order", 200).catch(() => []),
  });
  const { data: tryoutPlans = [] } = useQuery({
    queryKey: ["cycle-tryout-plans", effectiveClubId],
    queryFn: () => base44.entities.TryoutPlan.list("-created_date", 200).catch(() => []),
  });
  const { data: finalRegs = [] } = useQuery({
    queryKey: ["cycle-final-regs", effectiveClubId],
    queryFn: () => base44.entities.TryoutFinalRegistration.list("-created_date", 300).catch(() => []),
  });
  const { data: teamPlans = [] } = useQuery({
    queryKey: ["cycle-team-plans", effectiveClubId],
    queryFn: () => base44.entities.TeamPlan.list("-created_date", 300).catch(() => []),
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["cycle-posts", effectiveClubId],
    queryFn: () => base44.entities.Post.list("-created_date", 200).catch(() => []),
  });

  const clubSeasons = seasons.filter(byClub);
  const storedId = typeof localStorage !== 'undefined'
    ? localStorage.getItem(`selected-season-${effectiveClubId || "system"}`)
    : null;
  const storedSeason = clubSeasons.find((s) => s.id === storedId);
  return {
    lifecycleSeason: storedSeason || pickLifecycleSeason(clubSeasons),
    posts: posts.filter(byClub),
    seasons: clubSeasons,
    ageGroups: ageGroups.filter(byClub),
    tryoutPlans: tryoutPlans.filter(byClub),
    finalRegs: finalRegs.filter(byClub),
    teamPlans: teamPlans.filter(byClub),
  };
}

/**
 * Compute the 10-phase season lifecycle (see seasonLifecycle.js).
 * status: "done" | "in_progress" | "pending" | "blocked"
 */
export function computeCycleState(data) {
  return computePhases(data);
}

/**
 * Determine the next action based on the first incomplete cycle step.
 */
export function getNextAction(cycleSteps, data) {
  const { players, finalRegs, teams = [], teamPlans = [] } = data;
  const firstPending = cycleSteps.find((s) => s.status !== "done");
  if (!firstPending) {
    return {
      title: "Season cycle complete",
      detail: "All 10 phases done. Monitor operations and prepare for next season.",
      ctaLabel: "View Dashboard",
      ctaTo: "/Dashboard",
      icon: "CheckCircle2",
    };
  }

  switch (firstPending.key) {
    case "rollover":
      return {
        title: "Roll over to the new season",
        detail: "No active season found. Start the rollover to clone teams and begin the cycle.",
        ctaLabel: "Go to Seasons",
        ctaTo: "/Seasons",
        icon: "CalendarClock",
      };
    case "matrix":
      return {
        title: "Set up the age group matrix",
        detail: "Configure birth-date ranges and playing formats for each age group in the new season.",
        ctaLabel: "Configure Matrix",
        ctaTo: "/Seasons",
        icon: "Grid3x3",
      };
    case "team_plans": {
      const unassigned = teams.filter((t) => {
        const plan = teamPlans.find((p) => p.id === t.team_plan_id);
        return plan?.status !== "active";
      });
      return {
        title: "Assign team plans",
        detail: `${unassigned.length} team${unassigned.length === 1 ? "" : "s"} still need an active plan before tryouts are published and before final invites can go out.`,
        ctaLabel: "Assign Team Plans",
        ctaTo: "/TryoutDashboard?tab=plans",
        icon: "ClipboardCheck",
      };
    }
    case "tryout_plan":
      return {
        title: "Create a tryout plan",
        detail: "No tryout plans exist yet. Create one with a Main Club Tryout anchor event to kick off recruiting.",
        ctaLabel: "Open Tryout Planner",
        ctaTo: "/TryoutDashboard",
        icon: "ClipboardCheck",
      };
    case "registration":
      return {
        title: "Generate event registration pages",
        detail: "Main tryout events exist but registration pages are not live yet. Enable auto-registration on events.",
        ctaLabel: "Review Tryout Events",
        ctaTo: "/TryoutDashboard",
        icon: "Link2",
      };
    case "promotion":
      return {
        title: "Promote your tryouts",
        detail: "Tryout sessions are set. Send announcements and schedule social posts so families can register.",
        ctaLabel: "Open Marketing",
        ctaTo: "/Marketing",
        icon: "Mail",
      };
    case "tryout_day":
      return {
        title: "Run tryout day and finish evaluations",
        detail: "Check players in and make sure every attendee is scored before closing each session.",
        ctaLabel: "Open Tryout Planner",
        ctaTo: "/TryoutDashboard",
        icon: "ClipboardCheck",
      };
    case "rosters":
      return {
        title: "Complete coach roster selection",
        detail: players.filter((p) => !p.team_id).length + " players still unassigned. Coaches need to finalize their rosters.",
        ctaLabel: "View Teams",
        ctaTo: "/Registration?tab=teams",
        icon: "Users",
      };
    case "offers":
      return {
        title: "Send offers and guide registration",
        detail: finalRegs.length === 0
          ? "Rosters are filling. Send offers with waiver and payment links."
          : finalRegs.filter((f) => f.status === "invited").length + " offers still pending response.",
        ctaLabel: "Send Offers",
        ctaTo: "/TryoutDashboard",
        icon: "MailCheck",
      };
    case "switch":
      return {
        title: "Review the season switch",
        detail: "Every phase is complete. Run the pre-flight checks, then archive the old season and activate the new one.",
        ctaLabel: "Go to Seasons",
        ctaTo: "/Seasons",
        icon: "CalendarClock",
      };
    default:
      return null;
  }
}

/**
 * Compute blockers — cycle steps that are "pending" but have a prior step not yet done.
 * These are items waiting on someone else to act first.
 */
export function computeBlockers(cycleSteps) {
  const blockers = [];
  for (let i = 1; i < cycleSteps.length; i++) {
    const step = cycleSteps[i];
    if (step.status === "pending") {
      const prevStep = cycleSteps[i - 1];
      if (prevStep.status !== "done") {
        let waitingOn = "Club Admin";
        if (prevStep.key === "team_plans") waitingOn = "Club Admin";
        else if (prevStep.key === "tryout_plan") waitingOn = "Club Admin / Platform Director";
        else if (prevStep.key === "registration") waitingOn = "System (auto)";
        else if (prevStep.key === "promotion") waitingOn = "Club Admin / Branch leads";
        else if (prevStep.key === "tryout_day") waitingOn = "Coaches / Evaluators";
        else if (prevStep.key === "rosters") waitingOn = "Coaches";
        else if (prevStep.key === "offers") waitingOn = "Registrar / Families";

        blockers.push({
          title: step.label + " is blocked",
          waitingOn: waitingOn,
          detail: step.detail,
          to: step.key === "matrix" ? "/Seasons" : step.key === "team_plans" ? "/TryoutDashboard?tab=plans" : "/TryoutDashboard",
          actionLabel: "Resolve",
        });
      }
    }
  }
  return blockers;
}

/**
 * Team-level blockers — one entry per team missing a coach, branch, or active
 * plan, each with a direct action button (not just a status readout). Lets
 * the admin fix the exact team that's stalling the cycle, from the dashboard.
 */
export function computeTeamBlockers(teams = [], teamPlans = []) {
  const blockers = [];
  for (const team of teams) {
    const hasCoach = !!team.coach_id || (team.coach_ids || []).length > 0;
    const plan = teamPlans.find((p) => p.id === team.team_plan_id);
    const hasActivePlan = plan?.status === "active";

    if (!hasCoach) {
      blockers.push({
        title: `${team.name} has no coach assigned`,
        waitingOn: "Club Admin",
        detail: "Assign a coach so this team can run tryouts and select a roster.",
        to: "/Registration?tab=teams",
        actionLabel: "Assign Coach",
      });
    }
    if (!team.location_id) {
      blockers.push({
        title: `${team.name} has no branch`,
        waitingOn: "Club Admin",
        detail: "Assign a branch so the team can be scheduled and activated.",
        to: "/Registration?tab=teams",
        actionLabel: "Assign Branch",
      });
    }
    if (!plan) {
      blockers.push({
        title: `${team.name} has no team plan`,
        waitingOn: "Club Admin",
        detail: "Create or assign a dues plan before tryouts are published.",
        to: "/TryoutDashboard?tab=plans",
        actionLabel: "Assign Plan",
      });
    } else if (!hasActivePlan) {
      blockers.push({
        title: `${team.name}'s plan is ${plan.status}, not active`,
        waitingOn: "Club Admin",
        detail: "Activate this plan before final registration invites can be sent.",
        to: "/TryoutDashboard?tab=plans",
        actionLabel: "Activate Plan",
      });
    }
  }
  return blockers;
}