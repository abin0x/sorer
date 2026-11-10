// Setup Journey definition: six stages, their steps, step states and progress helpers.

export const STEP_STATES = {
  not_started: { label: "Not started", cls: "bg-slate-100 text-slate-600" },
  in_progress: { label: "In progress", cls: "bg-blue-100 text-blue-700" },
  needs_review: { label: "Needs review", cls: "bg-amber-100 text-amber-700" },
  blocked: { label: "Blocked", cls: "bg-red-100 text-red-700" },
  done: { label: "Done", cls: "bg-emerald-100 text-emerald-700" },
  skipped: { label: "Skipped", cls: "bg-slate-200 text-slate-600" },
  deferred: { label: "Deferred", cls: "bg-purple-100 text-purple-700" },
};

// A step no longer needs attention once it is done, skipped or deferred.
const RESOLVED = ["done", "skipped", "deferred"];

export const STAGES = [
  {
    id: "A", name: "Welcome and club profile", time: "5 min",
    steps: [
      { key: "a_profile", title: "Set up your club profile", desc: "Name, branding, branches, season conventions and how you want to start.", minutes: 5, kind: "profile" },
    ],
  },
  {
    id: "B", name: "Bring your data", time: "15-60 min",
    steps: [
      { key: "b_import", title: "Import and map your files", desc: "Upload players, families, teams, coaches and payments. We detect and map them for you.", minutes: 30, to: "/MigrationWizard",
        skipNote: "Your club will start empty. You can import data later from Settings, Data Management." },
      { key: "b_signoff", title: "Review and sign off the import", desc: "Check the counts and rejected rows, then confirm.", minutes: 10, to: "/MigrationWizard",
        skipNote: "Imported data will not be reconciled against your source files." },
    ],
  },
  {
    id: "C", name: "Current season", time: "20-40 min", panel: "season",
    steps: [
      { key: "c_season", title: "Confirm your current season", desc: "Season name and dates, status Active.", minutes: 5, to: "/Seasons" },
      { key: "c_teams", title: "Check teams and platforms", desc: "Every team needs a platform, age group and branch.", minutes: 10, to: "/Registration?tab=teams" },
      { key: "c_coaches", title: "Assign coaches", desc: "Give each team a head coach.", minutes: 8, to: "/ClubStaff",
        skipNote: "Teams without a coach will not appear on coach schedules or dashboards." },
      { key: "c_rosters", title: "Fix rosters", desc: "Place players without a team and flag teams that are too small or large.", minutes: 10, to: "/Registration?tab=players" },
      { key: "c_fees", title: "Set fees and payment plans", desc: "Import balances or define fees by team and platform.", minutes: 10, to: "/PaymentSettings",
        skipNote: "Families will not see what they owe until fees are set up." },
    ],
  },
  {
    id: "D", name: "Go live", time: "15 min", panel: "go_live",
    steps: [
      { key: "d_payments", title: "Connect payments", desc: "Connect your payment account so families can pay online.", minutes: 5, to: "/Connections",
        skipNote: "Players will not be able to pay online until payments are connected. A reminder stays visible until you do." },
      { key: "d_preview", title: "Preview as a coach, parent and director", desc: "See the app the way each person will before inviting anyone.", minutes: 5, to: "/home" },
      { key: "d_wave", title: "Send your first invitations", desc: "Invite directors first, then coaches, then families. Sending the first wave makes your club Live.", minutes: 5, to: "/ClubStaff" },
      { key: "d_help", title: "Explore help and training", desc: "Articles for your first week and one-click support.", minutes: 2, to: "/help" },
    ],
  },
  {
    id: "E", name: "Prepare next season", time: "Ongoing",
    steps: [
      { key: "e_prepare", title: "Start next season", desc: "Roll over teams with age-up.", minutes: 15, to: "/Seasons" },
      { key: "e_plans", title: "Build team plans", desc: "Set the team and platform matrix.", minutes: 20, to: "/TryoutDashboard" },
      { key: "e_tryouts", title: "Schedule tryouts", desc: "Main, supplemental and ID sessions.", minutes: 20, to: "/TryoutDashboard" },
    ],
  },
  {
    id: "F", name: "Lifecycle loop", time: "Yearly",
    steps: [
      { key: "f_evaluate", title: "Run check-in and evaluations", desc: "Tryout day check-in and coach evaluations.", minutes: 20, to: "/TryoutDashboard" },
      { key: "f_offers", title: "Select rosters and send offers", desc: "Selection, offers and guided family registration.", minutes: 20, to: "/TryoutDashboard" },
      { key: "f_switch", title: "Switch season and archive", desc: "Next season becomes Current, then the cycle restarts.", minutes: 10, to: "/Seasons" },
    ],
  },
];

export const ALL_STEPS = STAGES.flatMap((s) => s.steps.map((st) => ({ ...st, stage: s.id })));

export const stepOf = (journey, key) => ({ state: "not_started", ...(journey?.steps?.[key] || {}) });
export const isResolved = (journey, key) => RESOLVED.includes(stepOf(journey, key).state);

export const stageProgress = (journey, stage) => {
  const done = stage.steps.filter((s) => isResolved(journey, s.key)).length;
  return { done, total: stage.steps.length, complete: done === stage.steps.length };
};

export function overallPercent(journey) {
  const done = ALL_STEPS.filter((s) => isResolved(journey, s.key)).length;
  return Math.round((done / ALL_STEPS.length) * 100);
}

export const currentStage = (journey) =>
  STAGES.find((s) => !stageProgress(journey, s).complete) || STAGES[STAGES.length - 1];

/** The single step to do next: something already in progress first, then the first open step. */
export function nextAction(journey) {
  const stage = currentStage(journey);
  const open = stage.steps.filter((s) => !isResolved(journey, s.key));
  const pick = open.find((s) => ["in_progress", "needs_review"].includes(stepOf(journey, s.key).state))
    || open.find((s) => stepOf(journey, s.key).state !== "blocked") || open[0];
  return pick ? { stage, step: pick } : null;
}