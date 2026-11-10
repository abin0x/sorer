// Frontend constants and defaults for the Training Schedule Wizard.

export const GRID_COUNTS_DEFAULT = { "11v11": 8, "9v9": 6, "7v7": 4, "4v4": 2 };
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_SHORT = { Mon: "M", Tue: "T", Wed: "W", Thu: "T", Fri: "F", Sat: "S", Sun: "S" };

export const SOFT_PREFS_DEFAULT = {
  coach_back_to_back: 0.6,
  minimize_facility_changes: 0.5,
  preferred_days: 0.7,
  preferred_times: 0.7,
  same_slot_weekly: 0.8,
  keep_platform_together: 0.5,
  fewer_fragmented_grids: 0.4,
  fair_late_rotation: 0.4,
  continuity_last_season: 0.3,
};

export const SOFT_PREF_LABELS = {
  coach_back_to_back: "Coach back-to-back sessions",
  minimize_facility_changes: "Fewer facility changes per team",
  preferred_days: "Preferred training days",
  preferred_times: "Preferred time windows",
  same_slot_weekly: "Same slot every week",
  keep_platform_together: "Keep platform teams together",
  fewer_fragmented_grids: "Fewer fragmented grids",
  fair_late_rotation: "Fair rotation of late slots",
  continuity_last_season: "Continuity with last season",
};

export const HARD_RULES_DEFAULT = {
  format_fit: true,
  grid_capacity: true,
  no_coach_double: true,
  no_team_double: true,
  closures: true,
  dusk_unlit: true,
  travel_time: true,
  align_15min: true,
};

export const HARD_RULE_LABELS = {
  format_fit: "Format fit (field must support team format)",
  grid_capacity: "Grid capacity (grids per field not exceeded)",
  no_coach_double: "No coach double-booking",
  no_team_double: "No team double-booking",
  closures: "Respect field closures/maintenance",
  dusk_unlit: "No unlit outdoor fields after dusk",
  travel_time: "Respect coach travel time between facilities",
  align_15min: "15-minute time alignment",
};

export const LATEST_END_DEFAULT = {
  U8: 1080, U9: 1080, U10: 1140, U11: 1140, U12: 1200,
  U13: 1200, U14: 1260, U15: 1260, U16: 1320, U17: 1320, U18: 1320,
};

export const SESSION_LENGTH_OPTIONS = [60, 75, 90, 105, 120];
export const SESSIONS_PER_WEEK_OPTIONS = [1, 2, 3, 4];

export function minToLabel(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const period = h >= 12 ? "PM" : "AM";
  const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${dh}:${String(m).padStart(2, "0")} ${period}`;
}

export function buildDefaultConfig(teams, platforms) {
  const team_prefs = {};
  teams.forEach((t) => {
    team_prefs[t.id] = {
      sessions_per_week: 2,
      session_length_min: 90,
      preferred_days: ["Tue", "Thu"],
      coach_ids: t.coach_ids?.length ? t.coach_ids : t.coach_id ? [t.coach_id] : [],
    };
  });
  return {
    team_prefs,
    coach_availability: {},
    platform_priorities: platforms.map((p) => p.id),
    mode: "strict",
    hard_rules: { ...HARD_RULES_DEFAULT },
    soft_prefs: { ...SOFT_PREFS_DEFAULT },
    grid_counts: { ...GRID_COUNTS_DEFAULT },
    latest_end_by_age: { ...LATEST_END_DEFAULT },
    alignment: 15,
    season_start: new Date().toLocaleDateString("en-CA"),
    weeks: 12,
  };
}