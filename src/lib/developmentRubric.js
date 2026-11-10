/**
 * The Player Development evaluation rubric, shared by the desktop evaluation
 * dialog and the Beacon mobile dashboard so both score exactly the same criteria.
 * A club may override any section via clubs.terminology.development_rubric.
 */
export const TECHNICAL = {
  left: [
    { key: "first_touch", label: "First Touch" },
    { key: "receiving_under_pressure", label: "Receiving Under Pressure" },
    { key: "finishing", label: "Finishing" },
    { key: "crossing_service", label: "Crossing / Service" },
  ],
  right: [
    { key: "passing", label: "Passing" },
    { key: "dribbling_1v1", label: "Dribbling / 1v1" },
    { key: "heading", label: "Heading" },
    { key: "tackling_defending", label: "Tackling / Defending" },
  ],
};

export const TACTICAL_GROUPS = [
  { name: "Defending", items: [
    { key: "defending_organized", label: "Defending Organized" },
    { key: "defending_transition", label: "Defending Transition" },
    { key: "defending_set_pieces", label: "Defending Set Pieces" },
    { key: "defending_final_third", label: "Defending Final Third" },
    { key: "pressing", label: "Pressing" },
  ] },
  { name: "Attacking", items: [
    { key: "attacking_organized", label: "Attacking Organized" },
    { key: "attacking_in_transition", label: "Attacking in Transition" },
    { key: "attacking_set_pieces", label: "Attacking Set Pieces" },
    { key: "attacking_final_third", label: "Attacking Final Third" },
    { key: "building_out", label: "Building Out" },
  ] },
  { name: "Position Roles", items: [
    { key: "line_breaking", label: "Line Breaking" },
    { key: "possession_retention", label: "Possession Retention" },
    { key: "pressing_regaining", label: "Pressing & Regaining" },
    { key: "goal_scoring", label: "Goal Scoring" },
  ] },
];

export const MENTAL = [
  { letter: "M", key: "mindset", label: "Mindset" },
  { letter: "E", key: "effort", label: "Effort" },
  { letter: "N", key: "next_play_focus", label: "Next Play Focus" },
  { letter: "T", key: "team_first", label: "Team First" },
  { letter: "A", key: "assuredness", label: "Awareness" },
  { letter: "L", key: "leadership", label: "Leadership" },
];

export const SCORE_MIN = 1;
export const SCORE_MAX = 10;

const cleanItems = (items) => (Array.isArray(items) ? items : [])
  .filter((i) => i && typeof i.key === "string" && i.key.trim() && typeof i.label === "string" && i.label.trim())
  .map((i) => ({ key: i.key.trim(), label: i.label.trim() }));

const cleanGroups = (groups) => (Array.isArray(groups) ? groups : [])
  .map((g) => ({ name: typeof g?.name === "string" ? g.name.trim() : "", items: cleanItems(g?.items) }))
  .filter((g) => g.items.length);

/** Rubric sections in scoring order; club overrides replace a section only when valid. */
export function developmentRubric(saved) {
  const o = saved && typeof saved === "object" ? saved : {};
  const technical = cleanGroups(o.technical);
  const tactical = cleanGroups(o.tactical);
  const mental = cleanItems(o.mental);
  return [
    { field: "technical_scores", name: "Technical", tone: "primary",
      groups: technical.length ? technical : [{ name: "", items: [...TECHNICAL.left, ...TECHNICAL.right] }] },
    { field: "tactical_scores", name: "Tactical", tone: "accent",
      groups: tactical.length ? tactical : TACTICAL_GROUPS },
    { field: "mental_scores", name: "Mental", tone: "secondary",
      groups: [{ name: "", items: mental.length ? mental : MENTAL }] },
  ];
}

/** Average of every rubric score on the 1–10 scale, one decimal; null when nothing scored. */
export function overallScore(form) {
  const vals = ["technical_scores", "tactical_scores", "mental_scores"]
    .flatMap((f) => Object.values(form?.[f] || {}))
    .map(Number)
    .filter((v) => Number.isFinite(v) && v >= SCORE_MIN && v <= SCORE_MAX);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export function sectionAverage(scores) {
  const vals = Object.values(scores || {}).map(Number).filter((v) => Number.isFinite(v) && v > 0);
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
}

/** What players and guardians may see: only completed evaluations, sent feedback, notes not kept internal. */
export const familyCanSeeEvaluation = (e) => !!e && e.status !== "draft";
export const familyCanSeeFeedback = (f) => !!f && f.status === "sent";
export const familyCanSeeNote = (n) => !!n && n.visibility === "shared";
