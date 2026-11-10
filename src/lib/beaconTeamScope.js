/** Team scope for Beacon: people who can see several teams choose which ones
 *  appear in their chat and calendar. An empty selection means "all my teams". */
export function accessibleTeams(teams = [], membership = {}) {
  if (membership.allTeams) return teams;
  const ids = new Set(membership.teamIds || []);
  return teams.filter((t) => ids.has(t.id));
}

/** Keeps only selections the person can still access. */
export function cleanScope(selected = [], teams = []) {
  const ids = new Set(teams.map((t) => t.id));
  return selected.filter((id) => ids.has(id));
}

export function inScope(teamId, selected = []) {
  if (!selected.length || !teamId) return true; // club-wide items always show
  return selected.includes(teamId);
}

export const scopeStorageKey = (clubId, userId) => `beacon-team-scope:${clubId || "none"}:${userId || "anon"}`;
