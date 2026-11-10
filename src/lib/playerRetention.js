export const RETENTION_STATUSES = [
  { key: 'returning', label: 'Returning', requires_follow_up: false },
  { key: 'at_risk', label: 'At risk', requires_follow_up: true },
  { key: 'leaving', label: 'Leaving', requires_follow_up: true },
];
export const PLACEMENT_RECOMMENDATIONS = [
  { key: 'move_up', label: 'Move up' }, { key: 'keep', label: 'Keep' },
  { key: 'move_down', label: 'Move down' }, { key: 'move_out', label: 'Move out' },
];
export const TEAM_ROLES = [
  { key: 'indispensable', label: 'Indispensable' },
  ...['first', 'second', 'third'].flatMap((tier) => ['starter', 'squad'].map((role) => ({ key: `${tier}_team_${role}`, label: `${tier[0].toUpperCase()}${tier.slice(1)} team ${role}` }))),
];
export function mergeReviewOptions(defaults, saved) {
  const valid = Array.isArray(saved) ? saved.filter((v) => v && typeof v.key === 'string' && /^[a-z][a-z0-9_]*$/.test(v.key) && typeof v.label === 'string' && v.label.trim()) : [];
  const merged = defaults.map((d) => ({ ...d, ...valid.find((v) => v.key === d.key), requires_follow_up: d.requires_follow_up || valid.find((v) => v.key === d.key)?.requires_follow_up || false }));
  return [...merged, ...valid.filter((v, i) => !defaults.some((d) => d.key === v.key) && valid.findIndex((x) => x.key === v.key) === i)];
}
export function requiresDirectorFollowUp(intent, options = RETENTION_STATUSES) {
  return intent === 'at_risk' || intent === 'leaving' || !!options.find((o) => o.key === intent)?.requires_follow_up;
}
export function directorQueue(reviews, clubId, season) {
  return reviews.filter((r) => r.club_id === clubId && r.season === season && r.needs_follow_up && r.follow_up_status !== 'resolved')
    .sort((a, b) => Number(b.intent === 'leaving') - Number(a.intent === 'leaving'));
}
export function scopedPlayerReview(reviews, clubId, season, playerId) {
  return reviews.find((r) => r.club_id === clubId && r.season === season && r.player_id === playerId);
}
export const reviewLabel = (options, key) => options?.find((v) => v.key === key)?.label || key || 'Not reviewed';
/** Latest-season review per player plus that season's coach advice, same club only. */
export function latestRetentionByPlayer(reviews, coaches, clubId) {
  const out = {};
  for (const r of reviews) {
    if (r.club_id !== clubId || !r.player_id) continue;
    const cur = out[r.player_id]?.review;
    if (!cur || String(r.season) > String(cur.season)) out[r.player_id] = { review: r, coaches: [] };
  }
  for (const c of coaches) {
    const entry = out[c.player_id];
    if (c.club_id === clubId && entry && c.season === entry.review.season) entry.coaches.push(c);
  }
  return out;
}
