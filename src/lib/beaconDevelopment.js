export const PHYSICAL_FIELDS = [
  { key: "sprint_20m_seconds", label: "20m dash", unit: "s", scoreKey: "speed", lowerBetter: true, step: "0.01" },
  { key: "vertical_jump_inches", label: "Vertical jump", unit: "in", scoreKey: "power", lowerBetter: false, step: "0.1" },
  { key: "agility_5_10_5_seconds", label: "5-10-5 agility", unit: "s", scoreKey: "agility", lowerBetter: true, step: "0.01" },
  { key: "yoyo_level", label: "YIRT endurance", unit: "level", scoreKey: "endurance", lowerBetter: false, step: "0.1" },
];

/** Validate sideline entry without silently turning bad or blank input into zero. */
export function physicalAssessmentValues(form = {}) {
  const values = {};
  PHYSICAL_FIELDS.forEach(({ key, label }) => {
    const raw = form[key];
    if (raw == null || raw === "") return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be greater than zero.`);
    values[key] = value;
  });
  if (!Object.keys(values).length) throw new Error("Enter at least one physical test result.");
  return values;
}

export function skillResultValues({ test, score } = {}) {
  if (!test?.id || !test?.title) throw new Error("Choose a skill test.");
  if (score == null || score === "") throw new Error("Enter a test score.");
  const value = Number(score);
  if (!Number.isFinite(value) || value < 0) throw new Error("Score must be zero or greater.");
  return { test_id: test.id, test_title: test.title, score: value };
}

export function developmentGender(player) {
  const value = String(player?.gender || "").toLowerCase();
  if (value === "boys" || value === "male") return "male";
  if (value === "girls" || value === "female") return "female";
  return "all";
}

export function latestSkillScores(scores = []) {
  const latest = new Map();
  [...scores].sort((a, b) => new Date(a.test_date || a.created_date || 0) - new Date(b.test_date || b.created_date || 0))
    .forEach((score) => { if (score.test_id) latest.set(score.test_id, score); });
  return latest;
}
