// Standard position nomenclature: all positions numbered 1-11
// 1-Goalkeeper, 2-Right Back, 3-Left Back, 4-Right Centerback, 5-Left Centerback,
// 6-Holding Midfielder, 7-Right Winger, 8-Center Midfielder, 9-Center Forward,
// 10-Attacking Midfielder, 11-Left Midfielder

export const STANDARD_POSITIONS = [
  { number: 1, label: "Goalkeeper", key: "goalkeeper", guideKey: "goalkeeper" },
  { number: 2, label: "Right Back", key: "right_back", guideKey: "outside_back" },
  { number: 3, label: "Left Back", key: "left_back", guideKey: "outside_back" },
  { number: 4, label: "Right Centerback", key: "right_centerback", guideKey: "center_back" },
  { number: 5, label: "Left Centerback", key: "left_centerback", guideKey: "center_back" },
  { number: 6, label: "Holding Midfielder", key: "holding_midfielder", guideKey: "holding_midfielder" },
  { number: 7, label: "Right Winger", key: "right_winger", guideKey: "wide_forward" },
  { number: 8, label: "Center Midfielder", key: "center_midfielder", guideKey: "attacking_mid" },
  { number: 9, label: "Center Forward", key: "center_forward", guideKey: "central_forward" },
  { number: 10, label: "Attacking Midfielder", key: "attacking_midfielder", guideKey: "attacking_mid" },
  { number: 11, label: "Left Midfielder", key: "left_midfielder", guideKey: "wide_forward" },
];

export const POSITION_OPTIONS = STANDARD_POSITIONS.map((p) => ({
  value: `${p.number} - ${p.label}`,
  label: `${p.number} - ${p.label}`,
  key: p.key,
  guideKey: p.guideKey,
  number: p.number,
}));

export const POSITION_BY_KEY = Object.fromEntries(STANDARD_POSITIONS.map((p) => [p.key, p]));
export const POSITION_BY_LABEL = Object.fromEntries(STANDARD_POSITIONS.map((p) => [`${p.number} - ${p.label}`, p]));

// Map old position labels to new standard format
const OLD_TO_NEW = {
  Goalkeeper: "1 - Goalkeeper",
  "Center Back": "4 - Right Centerback",
  "Outside Back": "2 - Right Back",
  "Holding Midfielder": "6 - Holding Midfielder",
  "Attacking Mid": "10 - Attacking Midfielder",
  "Central Forward": "9 - Center Forward",
  "Wide Forward": "7 - Right Winger",
};

export function normalizePosition(pos) {
  if (!pos) return "";
  if (POSITION_BY_LABEL[pos]) return pos;
  if (OLD_TO_NEW[pos]) return OLD_TO_NEW[pos];
  const lower = pos.toLowerCase();
  for (const p of STANDARD_POSITIONS) {
    if (lower.includes(p.label.toLowerCase())) return `${p.number} - ${p.label}`;
  }
  return pos;
}

export function resolveGuideKey(position) {
  if (!position) return null;
  if (POSITION_BY_LABEL[position]) return POSITION_BY_LABEL[position].guideKey;
  const p = position.toLowerCase();
  if (p.includes("goalkeeper") || p.includes("keeper") || p === "gk") return "goalkeeper";
  if (p.includes("right back")) return "outside_back";
  if (p.includes("left back")) return "outside_back";
  if (p.includes("right center")) return "center_back";
  if (p.includes("left center")) return "center_back";
  if (p.includes("center back") || p.includes("centre back") || p.includes("centerback")) return "center_back";
  if (p.includes("outside back") || p.includes("fullback") || p.includes("full back") || p.includes("wing back")) return "outside_back";
  if (p.includes("holding") || p.includes("defensive mid")) return "holding_midfielder";
  if (p.includes("right winger") || p.includes("winger") || p.includes("wide forward") || p.includes("wide mid")) return "wide_forward";
  if (p.includes("left mid")) return "wide_forward";
  if (p.includes("center mid") || p.includes("central mid")) return "attacking_mid";
  if (p.includes("attacking mid")) return "attacking_mid";
  if (p.includes("center forward") || p.includes("striker") || p.includes("forward")) return "central_forward";
  if (p.includes("mid")) return "attacking_mid";
  if (p.includes("defender") || p.includes("back")) return "center_back";
  return null;
}