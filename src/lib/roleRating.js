/** Team roles double as the tryout overall rating. Roles are ordered best first;
 *  the stored 1-5 grade is derived from position so averages and sorting keep working. */
export function gradeForRole(roles, key) {
  const list = Array.isArray(roles) ? roles : [];
  const i = list.findIndex((r) => r.key === key);
  if (i < 0) return 0;
  if (list.length === 1) return 5;
  return Math.max(1, Math.min(5, Math.round(5 - (4 * i) / (list.length - 1))));
}
