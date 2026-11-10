// Default subtask template auto-generated for every TryoutEvent.
// due_offset_days = days BEFORE the event date the subtask is due.
export const TRYOUT_SUBTASK_TEMPLATE = [
  { type: "field", title: "Reserve the field", default_owner_role: "facility_manager", due_offset_days: 14 },
  { type: "staff", title: "Assign coaching staff", default_owner_role: "tryout_lead", due_offset_days: 10 },
  { type: "registration", title: "Create event signup page & track registration", default_owner_role: "club_admin", due_offset_days: 7 },
  { type: "marketing", title: "Advertise on web & socials", default_owner_role: "marketing_director", due_offset_days: 7 },
  { type: "comms", title: "Communicate with players & parents", default_owner_role: "tryout_lead", due_offset_days: 3 },
];

export const PARENT_TASK_DUE_OFFSET_DAYS = 1;

export const TRYOUT_EVENT_STAGES = [
  { key: "planned", label: "Planned" },
  { key: "in_progress", label: "In Progress" },
  { key: "ready", label: "Ready" },
  { key: "completed", label: "Completed" },
  { key: "post_tryout", label: "Post-Tryout" },
];

// Display metadata for the three TryoutEvent types.
export const EVENT_TYPE_META = {
  main_tryout: { label: "★ Main Club Tryout", short: "Main Tryout", badgeClass: "bg-amber-400 text-amber-950 border border-amber-500" },
  open_training: { label: "Open Training", short: "Open Training", badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300" },
  supplemental_tryout: { label: "Supplemental Tryout", short: "Supplemental", badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
};

/**
 * Tryout event lifecycle statuses shown to admins. The entity also accepts the
 * two legacy values ("active", "completed") so plans created before this list
 * existed stay valid.
 */
export const TRYOUT_PLAN_STATUSES = [
  { key: "draft", label: "Draft" },
  { key: "registration_open", label: "Registration open" },
  { key: "registration_closed", label: "Registration closed" },
  { key: "sessions_in_progress", label: "Sessions in progress" },
  { key: "evaluation", label: "Evaluation" },
  { key: "offers_out", label: "Offers out" },
  { key: "rosters_finalized", label: "Rosters finalized" },
  { key: "archived", label: "Archived" },
];

const LEGACY_PLAN_STATUS_LABELS = { active: "Active (legacy)", completed: "Completed (legacy)" };

export function planStatusLabel(key) {
  return (
    TRYOUT_PLAN_STATUSES.find((s) => s.key === key)?.label ||
    LEGACY_PLAN_STATUS_LABELS[key] ||
    "Draft"
  );
}

export const TRYOUT_FORMATS = ["4v4", "7v7", "9v9", "11v11"];
export const TRYOUT_GENDERS = ["Boys", "Girls"];

// Roles eligible to be selected as the Tryout Lead for a plan.
export const TRYOUT_LEAD_ROLES = ["coach", "branch_director", "platform_director", "tryout_lead"];

/** Current season string derived from today's date (soccer-year: Aug–Jul). */
export function currentSeason() {
  const now = new Date();
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

export function nextSeason() {
  const [start] = currentSeason().split("-").map(Number);
  return `${start + 1}-${start + 2}`;
}

/** Default playing format for a given age-group number (7 = U7, 8 = U8, ...). */
function defaultFormatForAge(ageNum) {
  if (ageNum <= 8) return "4v4";
  if (ageNum <= 10) return "7v7";
  if (ageNum <= 12) return "9v9";
  return "11v11";
}

/**
 * Computes a full U7-and-up age group matrix from a single anchor date: the
 * U7 age group's birth-date range start. Each older age group shifts the
 * whole range back exactly one year (U8 starts/ends one year before U7, etc).
 * Returns rows ready to bulkCreate into the AgeGroup entity (season_id/season_name
 * must be added by the caller).
 */
export function generateAgeGroupMatrix(u7StartDate, count = 13) {
  const start = new Date(`${u7StartDate}T00:00:00`);
  const rows = [];
  for (let k = 0; k < count; k++) {
    const ageNum = 7 + k;
    const rowStart = new Date(start);
    rowStart.setFullYear(rowStart.getFullYear() - k);
    const rowEndBase = new Date(start);
    rowEndBase.setFullYear(rowEndBase.getFullYear() + (1 - k));
    const rowEnd = new Date(rowEndBase);
    rowEnd.setDate(rowEnd.getDate() - 1);
    const toISO = (d) => d.toISOString().slice(0, 10);
    rows.push({
      age_group: `U${ageNum}`,
      birth_date_start: toISO(rowStart),
      birth_date_end: toISO(rowEnd),
      playing_format: defaultFormatForAge(ageNum),
      order: k,
    });
  }
  return rows;
}