// Curated defaults for the unified guided tour.

export const DEFAULT_BRANCH_NAMES = ["Northville", "Novi", "Lansing"];

export const SPORTS = [
  "Soccer", "Basketball", "Baseball", "Softball", "Volleyball",
  "Football", "Lacrosse", "Hockey", "Other",
];

export const PLATFORM_LIST = [
  "ECNL", "Girls Academy", "MLS Next", "Aspire", "ECNL RL",
  "Pre-ECNL", "Pre-GA", "Inspire", "Directors Academy",
  "MYSL", "WSSL", "MSDSL", "NAL", "MSPSP",
];

// Platforms selected by default (a realistic mix for a Michigan club)
export const DEFAULT_PLATFORMS = [
  "ECNL", "Girls Academy", "MLS Next", "MYSL", "MSPSP",
];

export const PLATFORM_GENDER_MAP = {
  "ECNL": "Boys and Girls",
  "Girls Academy": "Girls",
  "MLS Next": "Boys",
  "Aspire": "Boys and Girls",
  "ECNL RL": "Boys and Girls",
  "Pre-ECNL": "Boys and Girls",
  "Pre-GA": "Girls",
  "Inspire": "Girls",
  "Directors Academy": "Boys and Girls",
  "MYSL": "Boys and Girls",
  "WSSL": "Boys and Girls",
  "MSDSL": "Boys and Girls",
  "NAL": "Boys and Girls",
  "MSPSP": "Boys and Girls",
};

export const TOUR_STEPS = [
  { key: "club", label: "Your Club", icon: "Home" },
  { key: "branches", label: "Branches", icon: "GitBranch" },
  { key: "platforms", label: "Platforms", icon: "Trophy" },
  { key: "rollover", label: "Season", icon: "CalendarClock" },
  { key: "done", label: "Done", icon: "PartyPopper" },
];