const dayStr = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

/** Alerts for one branch from its scoped lifecycle data.
 *  Each alert: { severity, text, to, actionLabel } — `to` is the route to solve it. */
export function computeBranchAlerts(d) {
  const alerts = [];
  const live = (d.teams || []).filter((t) => !["retired", "skipped", "merged"].includes(t.status));
  const noCoach = live.filter((t) => !t.coach_id && !(t.coach_ids || []).length);
  const noPlan = live.filter((t) => !t.team_plan_id);
  if (noCoach.length) alerts.push({ severity: "medium", text: `${noCoach.length} team${noCoach.length > 1 ? "s" : ""} without a coach`, to: "/Registration?tab=teams", actionLabel: "Assign coaches" });
  if (noPlan.length) alerts.push({ severity: "medium", text: `${noPlan.length} team${noPlan.length > 1 ? "s" : ""} without a team plan`, to: "/TryoutDashboard?tab=plans", actionLabel: "Assign plans" });

  const draftPlans = (d.teamPlans || []).filter((p) => p.status === "draft" || p.status === "in_review");
  if (draftPlans.length) alerts.push({ severity: "info", text: `${draftPlans.length} team plan${draftPlans.length > 1 ? "s" : ""} awaiting approval`, to: "/TryoutDashboard?tab=approvals", actionLabel: "Review plans" });

  const today = dayStr(0);
  const weekOut = dayStr(7);
  const sessions = d.tryouts || [];
  const soon = sessions.filter((e) => e.date >= today && e.date <= weekOut);
  if (soon.length) alerts.push({ severity: "info", text: `${soon.length} tryout session${soon.length > 1 ? "s" : ""} this week`, to: "/TryoutDashboard", actionLabel: "View sessions" });
  const noField = soon.filter((e) => !e.location);
  if (noField.length) alerts.push({ severity: "high", text: `${noField.length} session${noField.length > 1 ? "s" : ""} this week with no field booked`, to: "/TryoutDashboard", actionLabel: "Book fields" });
  const full = sessions.filter((e) => e.date >= today && e.expected_attendance && (e.registration_count || 0) >= e.expected_attendance);
  if (full.length) alerts.push({ severity: "info", text: `${full.length} session${full.length > 1 ? "s are" : " is"} full, consider adding a supplemental tryout`, to: "/TryoutDashboard", actionLabel: "Add supplemental" });
  const unscored = sessions.filter((e) => e.date < today && (e.checked_in_count || 0) > (e.evaluated_count || 0));
  if (unscored.length) alerts.push({ severity: "high", text: `${unscored.length} past session${unscored.length > 1 ? "s" : ""} with unscored attendees`, to: "/TryoutDashboard", actionLabel: "Score attendees" });
  return alerts;
}