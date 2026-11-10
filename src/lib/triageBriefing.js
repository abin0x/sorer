import { requiresDirectorFollowUp } from "./playerRetention.js";

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString()}`;

/** Pure triage rules for the dashboard briefing. Returns items sorted by severity
 *  (critical, then warning). Empty queues are omitted so the widget can show "all clear". */
export function buildTriageItems({ overdue, retentionMap, retentionAllowed, pendingExpenses = [], links = {}, include = {} }) {
  const items = [];
  if (include.overdue && overdue?.openCases > 0) {
    const critical = (overdue.critical || 0) > 0 || (overdue.buckets?.["90+"]?.count || 0) > 0;
    items.push({
      key: "overdue",
      severity: critical ? "critical" : "warning",
      title: `${overdue.openCases} overdue payment case${overdue.openCases === 1 ? "" : "s"}`,
      detail: `${money(overdue.totalOutstanding)} outstanding${overdue.followUpsDue ? ` · ${overdue.followUpsDue} follow-up${overdue.followUpsDue === 1 ? "" : "s"} due` : ""}`,
      to: links.overdue,
      cta: "Resolve",
    });
  }
  if (include.retention && retentionAllowed && retentionMap) {
    const flagged = Object.values(retentionMap)
      .map((e) => e.review)
      .filter((r) => requiresDirectorFollowUp(r.intent) && r.follow_up_status !== "resolved");
    if (flagged.length) {
      const leaving = flagged.filter((r) => r.intent === "leaving").length;
      items.push({
        key: "retention",
        severity: leaving ? "critical" : "warning",
        title: `${flagged.length} player${flagged.length === 1 ? "" : "s"} at risk or leaving`,
        detail: leaving ? `${leaving} marked leaving · needs director outreach` : "Needs director outreach",
        to: links.retention,
        cta: "Review",
      });
    }
  }
  if (include.expenses && pendingExpenses.length) {
    const total = pendingExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    items.push({
      key: "expenses",
      severity: "warning",
      title: `${pendingExpenses.length} expense${pendingExpenses.length === 1 ? "" : "s"} awaiting approval`,
      detail: `${money(total)} submitted`,
      to: links.expenses,
      cta: "Approve",
    });
  }
  const rank = { critical: 0, warning: 1 };
  return items.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
