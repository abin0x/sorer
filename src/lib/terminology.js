import { STANDARD_POSITIONS } from "./positions.js";
import { RETENTION_STATUSES, PLACEMENT_RECOMMENDATIONS, TEAM_ROLES, mergeReviewOptions } from './playerRetention.js';
import { DEFAULT_CRITERIA, RECOMMENDATIONS, SCALE_LABELS } from "./evaluationCriteria.js";

/** Club-editable vocabulary. Saved per club in clubs.terminology; anything a club
 *  leaves blank falls back to these defaults. */
export const DEFAULT_TERMS = {
  club: { singular: "Club", plural: "Clubs" },
  branch: { singular: "Branch", plural: "Branches" },
  platform: { singular: "Platform", plural: "Platforms" },
  program: { singular: "Program", plural: "Programs" },
  team: { singular: "Team", plural: "Teams" },
  season: { singular: "Season", plural: "Seasons" },
  player: { singular: "Player", plural: "Players" },
  guardian: { singular: "Parent", plural: "Parents" },
  coach: { singular: "Coach", plural: "Coaches" },
  tryout: { singular: "Tryout", plural: "Tryouts" },
};

export const TERM_KEYS = Object.keys(DEFAULT_TERMS);

export const DEFAULT_TERMINOLOGY = {
  retentionStatuses: RETENTION_STATUSES,
  placementRecommendations: PLACEMENT_RECOMMENDATIONS,
  teamRoles: TEAM_ROLES,
  terms: DEFAULT_TERMS,
  positions: Object.fromEntries(STANDARD_POSITIONS.map((p) => [p.key, p.label])),
  scale: { ...SCALE_LABELS },
  criteria: DEFAULT_CRITERIA.map((c) => ({ ...c })),
  recommendations: Object.fromEntries(RECOMMENDATIONS.map((r) => [r.value, r.label])),
};

const clean = (v) => (typeof v === "string" ? v.trim() : "");

export function mergeTerminology(saved) {
  const s = saved && typeof saved === "object" ? saved : {};
  const terms = {};
  for (const k of TERM_KEYS) {
    terms[k] = {
      singular: clean(s.terms?.[k]?.singular) || DEFAULT_TERMS[k].singular,
      plural: clean(s.terms?.[k]?.plural) || DEFAULT_TERMS[k].plural,
    };
  }
  const pick = (defaults, given) =>
    Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, clean(given?.[k]) || v]));
  const criteria = Array.isArray(s.criteria)
    ? s.criteria.filter((c) => c && clean(c.key) && clean(c.label)).map((c) => ({ key: clean(c.key), label: clean(c.label) }))
    : [];
  return {
    retentionStatuses: mergeReviewOptions(RETENTION_STATUSES, s.retentionStatuses),
    placementRecommendations: mergeReviewOptions(PLACEMENT_RECOMMENDATIONS, s.placementRecommendations),
    teamRoles: mergeReviewOptions(TEAM_ROLES, s.teamRoles),
    terms,
    positions: pick(DEFAULT_TERMINOLOGY.positions, s.positions),
    scale: pick(DEFAULT_TERMINOLOGY.scale, s.scale),
    criteria: criteria.length ? criteria : DEFAULT_TERMINOLOGY.criteria,
    recommendations: pick(DEFAULT_TERMINOLOGY.recommendations, s.recommendations),
  };
}

export function term(t, key, plural = false) {
  const entry = t?.terms?.[key] || DEFAULT_TERMS[key];
  return entry ? (plural ? entry.plural : entry.singular) : key;
}

export function positionOptions(t) {
  return STANDARD_POSITIONS.map((p) => {
    const label = t?.positions?.[p.key] || p.label;
    return { value: `${p.number} - ${label}`, label: `${p.number} - ${label}`, key: p.key, number: p.number };
  });
}
