import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useReportScope } from "@/hooks/useReportScope";

// ── Query helpers ────────────────────────────────────────────────

/** Returns {} when ids is null (no filter), or { [field]: { $in: ids } } otherwise. */
function idFilter(ids, field) {
  if (ids === null || ids === undefined) return {};
  return { [field]: { $in: ids } };
}

function dateFilter(start, end, field) {
  if (!start && !end) return {};
  const q = {};
  if (start) q[field] = { ...q[field], $gte: start };
  if (end) q[field] = { ...q[field], $lte: end };
  return q;
}

// ── Main hook ────────────────────────────────────────────────────

/**
 * Fetches all KPI and chart data for the Reports Overview, server-side aggregated.
 * @param {Object} params
 * @param {Object} params.user - current user
 * @param {string} params.clubId - club tenant id
 * @param {Object} params.access - from getReportAccess()
 * @param {Object} params.filters - { seasonId, seasonName, branchId, teamId, platformId, dateStart, dateEnd, prevStart, prevEnd }
 */
export function useReportsData({ user, clubId, access, filters }) {
  const { effBranchIds, effTeamIds, scopeReady: scopeReadyBase } = useReportScope(user, clubId, access, filters);

  const base = { club_id: clubId };
  // If no roster rows carry the selected season's name (common for imported or
  // mislabeled seasons), fall back to club-wide counts instead of showing zeros.
  const seasonTagged = useQuery({
    queryKey: ["rpt-season-tagged", clubId, filters.seasonName],
    queryFn: () => base44.entities.Player.count({ club_id: clubId, season: filters.seasonName }),
    enabled: !!clubId && !!filters.seasonName,
  });
  const seasonName = filters.seasonName && seasonTagged.data > 0 ? filters.seasonName : null;
  const seasonReady = !filters.seasonName || seasonTagged.isFetched;
  const { dateStart, dateEnd, prevStart, prevEnd } = filters;
  const scopeReady = scopeReadyBase && !!clubId && seasonReady;

  // ── KPI: Active players ──
  const playerQuery = {
    ...base,
    status: "active",
    ...(seasonName ? { season: seasonName } : {}),
    ...idFilter(effBranchIds, "location_id"),
    ...idFilter(effTeamIds, "team_id"),
  };
  const activePlayers = useQuery({
    queryKey: ["rpt-active-players", playerQuery],
    queryFn: () => base44.entities.Player.count(playerQuery),
    enabled: scopeReady && access?.canSeeRoster,
  });

  // ── KPI: New registrations (current + prev) ──
  const regQuery = {
    ...base,
    ...idFilter(effBranchIds, "location_id"),
    ...idFilter(effTeamIds, "team_id"),
    ...dateFilter(dateStart, dateEnd, "registration_date"),
  };
  const newRegs = useQuery({
    queryKey: ["rpt-new-regs", regQuery],
    queryFn: () => base44.entities.Registration.count(regQuery),
    enabled: scopeReady && access?.canSeeRegistration,
  });
  const regPrevQuery = { ...base, ...idFilter(effBranchIds, "location_id"), ...idFilter(effTeamIds, "team_id"), ...dateFilter(prevStart, prevEnd, "registration_date") };
  const newRegsPrev = useQuery({
    queryKey: ["rpt-new-regs-prev", regPrevQuery],
    queryFn: () => base44.entities.Registration.count(regPrevQuery),
    enabled: scopeReady && access?.canSeeRegistration && !!prevStart,
  });

  // ── KPI: Roster fill vs target ──
  const teamQuery = {
    ...base,
    ...(seasonName ? { season: seasonName } : {}),
    ...idFilter(effBranchIds, "location_id"),
    ...(filters.platformId ? { platform_id: filters.platformId } : {}),
    ...idFilter(effTeamIds, "id"),
  };
  const rosterTarget = useQuery({
    queryKey: ["rpt-roster-target", teamQuery],
    queryFn: () => base44.entities.Team.aggregate({ query: teamQuery, sum: "max_roster_size" }),
    enabled: scopeReady && access?.canSeeRoster,
  });
  const rosterFilled = useQuery({
    queryKey: ["rpt-roster-filled", playerQuery],
    queryFn: () => base44.entities.Player.count({ ...playerQuery, team_id: { $exists: true, $ne: "" } }),
    enabled: scopeReady && access?.canSeeRoster,
  });

  // ── KPI: Revenue collected (from monthly chart) + prev ──
  const payQuery = {
    ...base,
    ...idFilter(effBranchIds, "branch_id"),
    ...idFilter(effTeamIds, "team_id"),
    ...dateFilter(dateStart, dateEnd, "payment_date"),
  };
  const revenueByMonth = useQuery({
    queryKey: ["rpt-revenue-month", payQuery],
    queryFn: () =>
      base44.entities.Payment.aggregate({
        query: { ...payQuery, is_refund: false, status: { $in: ["paid_in_full", "active"] } },
        dateBucket: { field: "payment_date", unit: "month" },
        sum: "amount",
      }),
    enabled: scopeReady && access?.canSeeFinance,
  });
  const payPrevQuery = {
    ...base,
    ...idFilter(effBranchIds, "branch_id"),
    ...idFilter(effTeamIds, "team_id"),
    ...dateFilter(prevStart, prevEnd, "payment_date"),
  };
  const revenuePrev = useQuery({
    queryKey: ["rpt-revenue-prev", payPrevQuery],
    queryFn: () =>
      base44.entities.Payment.aggregate({
        query: { ...payPrevQuery, is_refund: false, status: { $in: ["paid_in_full", "active"] } },
        sum: "amount",
      }),
    enabled: scopeReady && access?.canSeeFinance && !!prevStart,
  });

  // ── Chart: Revenue by branch ──
  const revenueByBranch = useQuery({
    queryKey: ["rpt-revenue-branch", payQuery],
    queryFn: () =>
      base44.entities.Payment.aggregate({
        query: { ...payQuery, is_refund: false, status: { $in: ["paid_in_full", "active"] } },
        groupBy: "branch_name",
        sum: "amount",
        sort: "-sum_amount",
      }),
    enabled: scopeReady && access?.canSeeFinance,
  });

  // ── KPI + Chart: Outstanding balance by aging ──
  const outstandingBase = {
    ...base,
    ...idFilter(effBranchIds, "location_id"),
    ...idFilter(effTeamIds, "team_id"),
    payment_status: { $ne: "paid" },
  };
  const today = new Date().toISOString().split("T")[0];
  const d30 = new Date(Date.now() - 30 * 864e5).toISOString().split("T")[0];
  const d60 = new Date(Date.now() - 60 * 864e5).toISOString().split("T")[0];

  const aging030 = useQuery({
    queryKey: ["rpt-aging-030", outstandingBase],
    queryFn: () =>
      base44.entities.Registration.aggregate({
        query: { ...outstandingBase, next_payment_date: { $gte: d30, $lt: today } },
        sum: ["amount_due", "amount_paid"],
      }),
    enabled: scopeReady && access?.canSeeFinance,
  });
  const aging3160 = useQuery({
    queryKey: ["rpt-aging-3160", outstandingBase],
    queryFn: () =>
      base44.entities.Registration.aggregate({
        query: { ...outstandingBase, next_payment_date: { $gte: d60, $lt: d30 } },
        sum: ["amount_due", "amount_paid"],
      }),
    enabled: scopeReady && access?.canSeeFinance,
  });
  const aging61 = useQuery({
    queryKey: ["rpt-aging-61", outstandingBase],
    queryFn: () =>
      base44.entities.Registration.aggregate({
        query: { ...outstandingBase, next_payment_date: { $lt: d60 } },
        sum: ["amount_due", "amount_paid"],
      }),
    enabled: scopeReady && access?.canSeeFinance,
  });

  // ── KPI: Overdue payments ──
  const overdueQuery = { ...outstandingBase, next_payment_date: { $lt: today } };
  const overdue = useQuery({
    queryKey: ["rpt-overdue", overdueQuery],
    queryFn: () => base44.entities.Registration.count(overdueQuery),
    enabled: scopeReady && access?.canSeeFinance,
  });

  // ── KPI: Event/camp signups (current + prev) ──
  const eventRegQuery = {
    ...base,
    ...dateFilter(dateStart, dateEnd, "registered_date"),
    status: { $ne: "cancelled" },
  };
  const eventSignups = useQuery({
    queryKey: ["rpt-event-signups", eventRegQuery],
    queryFn: () => base44.entities.EventRegistration.count(eventRegQuery).catch(() => 0),
    enabled: scopeReady && access?.canSeeRegistration,
  });
  const eventPrevQuery = { ...base, ...dateFilter(prevStart, prevEnd, "registered_date"), status: { $ne: "cancelled" } };
  const eventSignupsPrev = useQuery({
    queryKey: ["rpt-event-signups-prev", eventPrevQuery],
    queryFn: () => base44.entities.EventRegistration.count(eventPrevQuery).catch(() => 0),
    enabled: scopeReady && access?.canSeeRegistration && !!prevStart,
  });

  // ── KPI: Expenses pending approval ──
  const expQuery = { ...base, ...idFilter(effBranchIds, "branch_id"), status: "pending" };
  const expensesPending = useQuery({
    queryKey: ["rpt-exp-pending", expQuery],
    queryFn: () => base44.entities.Expense.count(expQuery),
    enabled: scopeReady && access?.canSeeFinance,
  });
  const expensesPendingSum = useQuery({
    queryKey: ["rpt-exp-pending-sum", expQuery],
    queryFn: () => base44.entities.Expense.aggregate({ query: expQuery, sum: "amount" }),
    enabled: scopeReady && access?.canSeeFinance,
  });

  // ── Chart: Registrations over time ──
  const regOverTime = useQuery({
    queryKey: ["rpt-reg-over-time", regQuery],
    queryFn: () =>
      base44.entities.Registration.aggregate({
        query: { ...base, ...idFilter(effBranchIds, "location_id"), ...idFilter(effTeamIds, "team_id"), ...dateFilter(dateStart, dateEnd, "registration_date") },
        dateBucket: { field: "registration_date", unit: "month" },
      }),
    enabled: scopeReady && access?.canSeeRegistration,
  });

  // ── Chart: Roster fill by age group ──
  const rosterByAgePlayers = useQuery({
    queryKey: ["rpt-roster-age-players", playerQuery],
    queryFn: () => base44.entities.Player.aggregate({ query: { ...playerQuery, team_id: { $exists: true, $ne: "" } }, groupBy: "age_group" }),
    enabled: scopeReady && access?.canSeeRoster,
  });
  const rosterByAgeTeams = useQuery({
    queryKey: ["rpt-roster-age-teams", teamQuery],
    queryFn: () => base44.entities.Team.aggregate({ query: teamQuery, groupBy: "age_group", sum: "max_roster_size" }),
    enabled: scopeReady && access?.canSeeRoster,
  });

  // ── Chart: Tryout funnel ── (counted from the real registration, evaluation and offer records)
  const tryoutFunnel = useQuery({
    queryKey: ["rpt-tryout-funnel", clubId],
    queryFn: async () => {
      const [registered, checkedIn, evals, offered, accepted] = await Promise.all([
        base44.entities.TryoutRegistration.count({ ...base, status: { $ne: "cancelled" } }),
        base44.entities.TryoutRegistration.count({ ...base, checked_in: true }),
        base44.entities.TryoutEvaluation.aggregate({ query: base, groupBy: "player_id" }),
        base44.entities.TryoutOffer.count({ ...base, status: { $in: ["sent", "accepted", "declined", "expired"] } }).catch(() => 0),
        base44.entities.TryoutOffer.count({ ...base, status: "accepted" }).catch(() => 0),
      ]);
      const evaluated = (evals?.rows || []).filter((r) => r.player_id).length;
      return { rows: [{ sum_registration_count: registered, sum_checked_in_count: checkedIn, sum_evaluated_count: evaluated, sum_offered_count: offered, sum_accepted_count: accepted }] };
    },
    enabled: scopeReady && access?.canSeeTryouts,
  });
  const fullyRegistered = useQuery({
    queryKey: ["rpt-fully-reg", base],
    queryFn: () => base44.entities.Registration.count({ ...base, offer_id: { $exists: true, $ne: "" } }),
    enabled: scopeReady && access?.canSeeTryouts,
  });

  // ── Assemble KPIs ──
  const revenueTotal = (revenueByMonth.data?.rows || []).reduce((s, r) => s + (r.sum_amount || 0), 0);
  const revenuePrevVal = revenuePrev.data?.rows?.[0]?.sum_amount || 0;
  const revenueChange = prevStart && revenuePrevVal > 0 ? ((revenueTotal - revenuePrevVal) / revenuePrevVal) * 100 : null;

  const newRegsVal = newRegs.data || 0;
  const newRegsPrevVal = newRegsPrev.data || 0;
  const newRegsChange = prevStart && newRegsPrevVal > 0 ? ((newRegsVal - newRegsPrevVal) / newRegsPrevVal) * 100 : null;

  const eventSignupsVal = eventSignups.data || 0;
  const eventSignupsPrevVal = eventSignupsPrev.data || 0;
  const eventSignupsChange = prevStart && eventSignupsPrevVal > 0 ? ((eventSignupsVal - eventSignupsPrevVal) / eventSignupsPrevVal) * 100 : null;

  const target = rosterTarget.data?.rows?.[0]?.sum_max_roster_size || 0;
  const filled = rosterFilled.data || 0;
  const fillPct = target > 0 ? (filled / target) * 100 : 0;

  const outstanding030 = (aging030.data?.rows?.[0]?.sum_amount_due || 0) - (aging030.data?.rows?.[0]?.sum_amount_paid || 0);
  const outstanding3160 = (aging3160.data?.rows?.[0]?.sum_amount_due || 0) - (aging3160.data?.rows?.[0]?.sum_amount_paid || 0);
  const outstanding61 = (aging61.data?.rows?.[0]?.sum_amount_due || 0) - (aging61.data?.rows?.[0]?.sum_amount_paid || 0);
  const outstandingTotal = Math.max(0, outstanding030 + outstanding3160 + outstanding61);

  const kpis = [
    ...(access?.canSeeRoster ? [{
      key: "active_players", label: "Active Players", value: activePlayers.data || 0, format: "number",
      icon: "Users", category: "roster",
    }] : []),
    ...(access?.canSeeRegistration ? [{
      key: "new_registrations", label: "New Registrations", value: newRegsVal, format: "number",
      change: newRegsChange, icon: "UserPlus", category: "registration",
    }] : []),
    ...(access?.canSeeRoster ? [{
      key: "roster_fill", label: "Roster Fill vs Target", value: fillPct, format: "percent",
      subtitle: `${filled}/${target} spots`, icon: "UsersRound", category: "roster",
    }] : []),
    ...(access?.canSeeFinance ? [{
      key: "revenue", label: "Revenue Collected", value: revenueTotal, format: "currency",
      change: revenueChange, icon: "DollarSign", category: "finance",
    }] : []),
    ...(access?.canSeeFinance ? [{
      key: "outstanding", label: "Outstanding Balance", value: outstandingTotal, format: "currency",
      icon: "Wallet", category: "finance",
    }] : []),
    ...(access?.canSeeFinance ? [{
      key: "overdue", label: "Overdue Payments", value: overdue.data || 0, format: "number",
      icon: "AlertCircle", category: "finance",
    }] : []),
    ...(access?.canSeeRegistration ? [{
      key: "event_signups", label: "Event / Camp Signups", value: eventSignupsVal, format: "number",
      change: eventSignupsChange, icon: "CalendarCheck", category: "registration",
    }] : []),
    ...(access?.canSeeFinance ? [{
      key: "expenses_pending", label: "Expenses Pending Approval", value: expensesPending.data || 0, format: "number",
      subtitle: (expensesPendingSum.data?.rows?.[0]?.sum_amount || 0) > 0 ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(expensesPendingSum.data.rows[0].sum_amount) : "",
      icon: "Receipt", category: "finance",
    }] : []),
  ];

  // ── Assemble charts ──
  const charts = {
    registrationsOverTime: {
      title: "Registrations Over Time",
      data: (regOverTime.data?.rows || []).map((r) => ({ month: r._id || r.date || r.bucket, count: r.count || 0 })),
      isLoading: regOverTime.isLoading, isEmpty: (regOverTime.data?.rows || []).length === 0,
    },
    revenueByMonth: {
      title: "Revenue by Month",
      data: (revenueByMonth.data?.rows || []).map((r) => ({ month: r._id || r.date || r.bucket, amount: r.sum_amount || 0 })),
      isLoading: revenueByMonth.isLoading, isEmpty: (revenueByMonth.data?.rows || []).length === 0,
    },
    revenueByBranch: {
      title: "Revenue by Branch",
      data: (revenueByBranch.data?.rows || []).filter((r) => r.branch_name).map((r) => ({ branch: r.branch_name, amount: r.sum_amount || 0 })),
      isLoading: revenueByBranch.isLoading, isEmpty: (revenueByBranch.data?.rows || []).length === 0,
    },
    aging: {
      title: "Outstanding Balances by Aging",
      data: [
        { bucket: "0-30 days", amount: Math.max(0, outstanding030) },
        { bucket: "31-60 days", amount: Math.max(0, outstanding3160) },
        { bucket: "61+ days", amount: Math.max(0, outstanding61) },
      ],
      isLoading: aging030.isLoading || aging3160.isLoading || aging61.isLoading,
      isEmpty: outstandingTotal === 0,
    },
    rosterFill: {
      title: "Roster Fill by Age Group",
      data: (rosterByAgePlayers.data?.rows || []).map((r) => {
        const ageGroup = r.age_group || "Unknown";
        const teamRow = (rosterByAgeTeams.data?.rows || []).find((t) => (t.age_group || "Unknown") === ageGroup);
        return { ageGroup, filled: r.count || 0, target: teamRow?.sum_max_roster_size || 0 };
      }),
      isLoading: rosterByAgePlayers.isLoading || rosterByAgeTeams.isLoading,
      isEmpty: (rosterByAgePlayers.data?.rows || []).length === 0,
    },
    tryoutFunnel: {
      title: "Tryout Funnel",
      data: [
        { stage: "Registered", value: tryoutFunnel.data?.rows?.[0]?.sum_registration_count || 0 },
        { stage: "Checked In", value: tryoutFunnel.data?.rows?.[0]?.sum_checked_in_count || 0 },
        { stage: "Evaluated", value: tryoutFunnel.data?.rows?.[0]?.sum_evaluated_count || 0 },
        { stage: "Offered", value: tryoutFunnel.data?.rows?.[0]?.sum_offered_count || 0 },
        { stage: "Accepted", value: tryoutFunnel.data?.rows?.[0]?.sum_accepted_count || 0 },
        { stage: "Fully Registered", value: fullyRegistered.data || 0 },
      ],
      isLoading: tryoutFunnel.isLoading || fullyRegistered.isLoading,
      isEmpty: (tryoutFunnel.data?.rows?.[0]?.sum_registration_count || 0) === 0,
    },
  };

  const isLoading =
    (access?.canSeeRoster && (activePlayers.isLoading || rosterTarget.isLoading || rosterFilled.isLoading)) ||
    (access?.canSeeRegistration && (newRegs.isLoading || eventSignups.isLoading)) ||
    (access?.canSeeFinance && (revenueByMonth.isLoading || aging030.isLoading || expensesPending.isLoading)) ||
    (access?.canSeeTryouts && tryoutFunnel.isLoading);

  return { kpis, charts, isLoading, scopeReady, needsClub: !clubId, seasonFallback: !!filters.seasonName && seasonTagged.isFetched && !seasonName };
}