// Shared scoring helpers: convert raw test measurements into 0-100 percentage
// scores using admin-defined benchmark points (p20, p40, p60, p80, p100).

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Interpolates a raw measurement into a 0-100 score using 5 benchmark points.
// Points are always ordered by score (20,40,60,80,100); their raw values may
// ascend (higher_better) or descend (lower_better) — we detect that from the data.
export function scoreFromBenchmark(rawValue, benchmark) {
  if (rawValue == null || rawValue === "" || !benchmark) return null;
  const pts = [
    { score: 20, value: benchmark.p20 },
    { score: 40, value: benchmark.p40 },
    { score: 60, value: benchmark.p60 },
    { score: 80, value: benchmark.p80 },
    { score: 100, value: benchmark.p100 },
  ];
  if (pts.some((p) => p.value == null || p.value === "")) return null;
  const raw = Number(rawValue);
  const ascending = pts[4].value >= pts[0].value;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const inRange = ascending ? raw >= a.value && raw <= b.value : raw <= a.value && raw >= b.value;
    if (inRange && a.value !== b.value) {
      const t = (raw - a.value) / (b.value - a.value);
      return Math.round(clamp(a.score + t * (b.score - a.score), 0, 100));
    }
  }
  // Outside the defined range — extrapolate one segment's slope, then clamp.
  const first = pts[0], second = pts[1], last = pts[3], top = pts[4];
  const beyondLow = ascending ? raw < first.value : raw > first.value;
  if (beyondLow) {
    const slope = (second.score - first.score) / (second.value - first.value);
    return Math.round(clamp(first.score + slope * (raw - first.value), 0, 100));
  }
  const slope = (top.score - last.score) / (top.value - last.value);
  return Math.round(clamp(top.score + slope * (raw - top.value), 0, 100));
}

// Technical %: average of a player's most recent score per SkillTest, each
// converted to a 0-100 percentage via its matching skill TestBenchmark.
export function computeTechnicalScore(skillTestScores, benchmarks) {
  if (!skillTestScores?.length) return null;
  const latestPerTest = new Map();
  [...skillTestScores]
    .sort((a, b) => new Date(a.test_date || a.created_date) - new Date(b.test_date || b.created_date))
    .forEach((s) => latestPerTest.set(s.test_id, s));

  let weightedSum = 0;
  let weightSum = 0;
  Array.from(latestPerTest.values()).forEach((s) => {
    const b = benchmarks.find((x) => x.category === "skill" && x.test_key === s.test_id);
    if (b) {
      const pct = scoreFromBenchmark(s.score, b);
      if (pct != null) {
        const coeff = b.coefficient || 1;
        weightedSum += pct * coeff;
        weightSum += coeff;
      }
    }
  });

  if (!weightSum) return null;
  return Math.round(weightedSum / weightSum);
}

const PHYSICAL_TEST_KEYS = [
  { key: "speed", raw: "sprint_20m_seconds" },
  { key: "power", raw: "vertical_jump_inches" },
  { key: "agility", raw: "agility_5_10_5_seconds" },
  { key: "endurance", raw: "yoyo_level" },
];

// Physical %: average of Speed/Power/Agility/Endurance, each converted via
// its gender-specific (or "all") physical TestBenchmark.
export function computePhysicalScore(assessment, benchmarks, gender) {
  if (!assessment) return null;
  let weightedSum = 0;
  let weightSum = 0;
  PHYSICAL_TEST_KEYS.forEach(({ key, raw }) => {
    const raw_value = assessment[raw];
    if (raw_value == null) return;
    const b =
      benchmarks.find((x) => x.category === "physical" && x.test_key === key && x.gender === gender) ||
      benchmarks.find((x) => x.category === "physical" && x.test_key === key && x.gender === "all");
    if (b) {
      const pct = scoreFromBenchmark(raw_value, b);
      if (pct != null) {
        const coeff = b.coefficient || 1;
        weightedSum += pct * coeff;
        weightSum += coeff;
      }
    }
  });

  if (!weightSum) return null;
  return Math.round(weightedSum / weightSum);
}

export function computePhysicalSubScores(assessment, benchmarks, gender) {
  const out = {};
  PHYSICAL_TEST_KEYS.forEach(({ key, raw }) => {
    const raw_value = assessment?.[raw];
    const b =
      benchmarks.find((x) => x.category === "physical" && x.test_key === key && x.gender === gender) ||
      benchmarks.find((x) => x.category === "physical" && x.test_key === key && x.gender === "all");
    out[key] = b ? scoreFromBenchmark(raw_value, b) : null;
  });
  return out;
}

export const PHYSICAL_TEST_DEFS = [
  { key: "speed", label: "Speed", metricLabel: "20-Meter Sprint", unit: "seconds", direction: "lower_better" },
  { key: "power", label: "Power", metricLabel: "Vertical Jump", unit: "inches", direction: "higher_better" },
  { key: "agility", label: "Agility", metricLabel: "5-10-5 Agility", unit: "seconds", direction: "lower_better" },
  { key: "endurance", label: "Endurance", metricLabel: "Yo-Yo Intermittent Recovery", unit: "levels", direction: "higher_better" },
];

export function ratingLabel10(v) {
  if (v == null) return "Not Rated";
  if (v >= 9) return "Expert";
  if (v >= 7) return "Advanced";
  if (v >= 4) return "Intermediate";
  if (v >= 2) return "Developing";
  return "Beginner";
}