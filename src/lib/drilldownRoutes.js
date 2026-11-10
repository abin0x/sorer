/**
 * Drill-down routes: screens you reach by opening a row, card or record from a
 * list (player, team, tryout plan, staff profile, help article).
 *
 * Only these get the horizontal slide transition. Every other route — top-level
 * sections, bottom-tab targets, dashboards — keeps the existing fade, so tab
 * navigation and the browser back stack read exactly as they did before.
 */
const DRILL_DOWN_PATHS = [
  /^\/PlayerDetail/i,
  /^\/TeamDetail/i,
  /^\/TryoutPlanDetail/i,
  /^\/UserProfileView/i,
  /^\/help\/article\//i,
];

export function isDrillDownPath(pathname = '') {
  return DRILL_DOWN_PATHS.some((pattern) => pattern.test(pathname));
}