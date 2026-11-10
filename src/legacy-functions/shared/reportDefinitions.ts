// @ts-nocheck
/**
 * Server-side report definitions — mirrors src/lib/reports/reportLibrary.js
 * but without frontend-only fields (icons, defaultVisible, groupable, etc.).
 *
 * Used by the run-report-schedules backend function to build scoped queries
 * and generate CSV attachments per recipient.
 *
 * KEEP IN SYNC with src/lib/reports/reportLibrary.js when adding/changing reports.
 */

export function idFilter(ids: string[] | null, field: string): Record<string, any> {
  if (ids === null || ids === undefined) return {};
  return { [field]: { $in: ids } };
}

export function dateFilter(start: string, end: string, field: string): Record<string, any> {
  if (!start && !end) return {};
  const q: Record<string, any> = {};
  if (start) q[field] = { ...q[field], $gte: start };
  if (end) q[field] = { ...q[field], $lte: end };
  return q;
}

export interface ReportColumn {
  key: string;
  label: string;
  type: "text" | "currency" | "number" | "date" | "boolean" | "array" | "status";
  totalable?: boolean;
  compute?: (row: any) => any;
}

export interface ReportDefinition {
  id: string;
  name: string;
  entity: string;
  category: string;
  module?: string;
  requiresAccess: string;
  defaultSort: string;
  columns: ReportColumn[];
  buildQuery: (globalFilters: any, reportFilters: any, scope: any) => Record<string, any>;
}

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: "payments_received",
    name: "Payments Received",
    entity: "Payment",
    category: "finance",
    requiresAccess: "canSeeFinance",
    defaultSort: "-payment_date",
    columns: [
      { key: "payment_date", label: "Date", type: "date" },
      { key: "player_name", label: "Player", type: "text" },
      { key: "guardian_name", label: "Guardian", type: "text" },
      { key: "source_label", label: "Source", type: "text" },
      { key: "team_name", label: "Team", type: "text" },
      { key: "branch_name", label: "Branch", type: "text" },
      { key: "amount", label: "Amount", type: "currency", totalable: true },
      { key: "payment_method", label: "Method", type: "text" },
      { key: "status", label: "Status", type: "status" },
    ],
    buildQuery: (g, rf, s) => {
      const q: any = {
        club_id: s.clubId,
        ...idFilter(s.effBranchIds, "branch_id"),
        ...idFilter(s.effTeamIds, "team_id"),
        ...dateFilter(g.dateStart, g.dateEnd, "payment_date"),
        is_refund: false,
      };
      if (rf.status && rf.status !== "all") q.status = rf.status;
      if (rf.payment_method && rf.payment_method !== "all") q.payment_method = rf.payment_method;
      if (rf.include_refunds === "yes") delete q.is_refund;
      return q;
    },
  },
  {
    id: "outstanding_balances",
    name: "Outstanding Balances & Aging",
    entity: "Registration",
    category: "finance",
    requiresAccess: "canSeeFinance",
    defaultSort: "-next_installment_date",
    columns: [
      { key: "player_name", label: "Player", type: "text" },
      { key: "guardian_name", label: "Guardian", type: "text" },
      { key: "team_name", label: "Team", type: "text" },
      { key: "location_name", label: "Branch", type: "text" },
      { key: "amount_due", label: "Due", type: "currency", totalable: true },
      { key: "amount_paid", label: "Paid", type: "currency", totalable: true },
      { key: "balance", label: "Balance", type: "currency", totalable: true, compute: (r) => (r.amount_due || 0) - (r.amount_paid || 0) },
      { key: "next_installment_date", label: "Next Due", type: "date" },
      { key: "payment_status", label: "Pay Status", type: "status" },
    ],
    buildQuery: (g, rf, s) => {
      const q: any = {
        club_id: s.clubId,
        ...idFilter(s.effBranchIds, "location_id"),
        ...idFilter(s.effTeamIds, "team_id"),
        payment_status: { $ne: "paid" },
        ...dateFilter(g.dateStart, g.dateEnd, "registration_date"),
      };
      if (rf.payment_status && rf.payment_status !== "all") q.payment_status = rf.payment_status;
      return q;
    },
  },
  {
    id: "registrations_breakdown",
    name: "Registrations by Season / Team / Platform",
    entity: "Registration",
    category: "registration",
    requiresAccess: "canSeeRegistration",
    defaultSort: "-registration_date",
    columns: [
      { key: "player_name", label: "Player", type: "text" },
      { key: "guardian_name", label: "Guardian", type: "text" },
      { key: "program_title", label: "Program", type: "text" },
      { key: "team_name", label: "Team", type: "text" },
      { key: "location_name", label: "Branch", type: "text" },
      { key: "registration_date", label: "Date", type: "date" },
      { key: "status", label: "Status", type: "status" },
      { key: "payment_status", label: "Pay Status", type: "status" },
      { key: "amount_due", label: "Due", type: "currency", totalable: true },
      { key: "amount_paid", label: "Paid", type: "currency", totalable: true },
    ],
    buildQuery: (g, rf, s) => {
      const q: any = {
        club_id: s.clubId,
        ...idFilter(s.effBranchIds, "location_id"),
        ...idFilter(s.effTeamIds, "team_id"),
        ...dateFilter(g.dateStart, g.dateEnd, "registration_date"),
      };
      if (rf.status && rf.status !== "all") q.status = rf.status;
      if (rf.payment_status && rf.payment_status !== "all") q.payment_status = rf.payment_status;
      return q;
    },
  },
  {
    id: "team_rosters",
    name: "Team Rosters",
    entity: "Team",
    category: "registration",
    requiresAccess: "canSeeRoster",
    defaultSort: "name",
    columns: [
      { key: "name", label: "Team", type: "text" },
      { key: "age_group", label: "Age", type: "text" },
      { key: "gender", label: "Gender", type: "text" },
      { key: "platform_name", label: "Platform", type: "text" },
      { key: "coach_names", label: "Coaches", type: "array" },
      { key: "max_roster_size", label: "Capacity", type: "number", totalable: true },
      { key: "player_count", label: "Rostered", type: "number", totalable: true, compute: (r) => (r.player_ids || []).length },
      { key: "location_name", label: "Branch", type: "text" },
      { key: "status", label: "Status", type: "status" },
    ],
    buildQuery: (g, rf, s) => {
      const q: any = {
        club_id: s.clubId,
        ...idFilter(s.effBranchIds, "location_id"),
        ...idFilter(s.effTeamIds, "id"),
        ...(g.seasonName ? { season: g.seasonName } : {}),
        ...(g.platformId ? { platform_id: g.platformId } : {}),
      };
      if (rf.status && rf.status !== "all") q.status = rf.status;
      return q;
    },
  },
  {
    id: "tryout_funnel",
    name: "Tryout Funnel & Evaluation Summary",
    entity: "TryoutEvent",
    category: "tryouts",
    requiresAccess: "canSeeTryouts",
    defaultSort: "-date",
    columns: [
      { key: "date", label: "Date", type: "date" },
      { key: "type", label: "Type", type: "text" },
      { key: "location", label: "Location", type: "text" },
      { key: "registration_count", label: "Registered", type: "number", totalable: true },
      { key: "checked_in_count", label: "Checked In", type: "number", totalable: true },
      { key: "evaluated_count", label: "Evaluated", type: "number", totalable: true },
      { key: "offered_count", label: "Offered", type: "number", totalable: true },
      { key: "accepted_count", label: "Accepted", type: "number", totalable: true },
      { key: "stage", label: "Stage", type: "status" },
    ],
    buildQuery: (g, rf, s) => {
      const q: any = {
        club_id: s.clubId,
        ...dateFilter(g.dateStart, g.dateEnd, "date"),
      };
      if (rf.type && rf.type !== "all") q.type = rf.type;
      if (rf.stage && rf.stage !== "all") q.stage = rf.stage;
      return q;
    },
  },
  {
    id: "event_signups",
    name: "Event & Camp Signups and Revenue",
    entity: "EventRegistration",
    category: "events",
    requiresAccess: "canSeeRegistration",
    defaultSort: "-registered_date",
    columns: [
      { key: "event_name", label: "Event", type: "text" },
      { key: "player_name", label: "Participant", type: "text" },
      { key: "guardian_name", label: "Guardian", type: "text" },
      { key: "registered_date", label: "Date", type: "date" },
      { key: "status", label: "Status", type: "status" },
      { key: "amount_due", label: "Due", type: "currency", totalable: true },
      { key: "amount_paid", label: "Paid", type: "currency", totalable: true },
      { key: "payment_status", label: "Pay Status", type: "status" },
    ],
    buildQuery: (g, rf, s) => {
      const q: any = {
        club_id: s.clubId,
        ...dateFilter(g.dateStart, g.dateEnd, "registered_date"),
      };
      if (rf.status && rf.status !== "all") q.status = rf.status;
      if (rf.payment_status && rf.payment_status !== "all") q.payment_status = rf.payment_status;
      return q;
    },
  },
  {
    id: "expense_reports",
    name: "Expense Reports by Status / Team / Type",
    entity: "Expense",
    category: "expenses",
    requiresAccess: "canSeeFinance",
    defaultSort: "-date",
    columns: [
      { key: "description", label: "Description", type: "text" },
      { key: "amount", label: "Amount", type: "currency", totalable: true },
      { key: "date", label: "Date", type: "date" },
      { key: "category", label: "Category", type: "text" },
      { key: "payment_status", label: "Pay Status", type: "status" },
      { key: "status", label: "Approval", type: "status" },
    ],
    buildQuery: (g, rf, s) => {
      const q: any = {
        club_id: s.clubId,
        ...idFilter(s.effBranchIds, "branch_id"),
        ...dateFilter(g.dateStart, g.dateEnd, "date"),
      };
      if (rf.status && rf.status !== "all") q.status = rf.status;
      if (rf.payment_status && rf.payment_status !== "all") q.payment_status = rf.payment_status;
      return q;
    },
  },
  // ── Module: Facilities ──
  {
    id: "field_utilization",
    name: "Field Utilization",
    entity: "Booking",
    category: "facilities",
    module: "facility_management",
    requiresAccess: "canSeeFinance",
    defaultSort: "-date",
    columns: [
      { key: "date", label: "Date", type: "date" },
      { key: "day", label: "Day", type: "text" },
      { key: "field_name", label: "Field", type: "text" },
      { key: "facility_name", label: "Facility", type: "text" },
      { key: "start_time", label: "Start", type: "text" },
      { key: "end_time", label: "End", type: "text" },
      { key: "type", label: "Type", type: "text" },
      { key: "team_name", label: "Team", type: "text" },
      { key: "status", label: "Status", type: "status" },
    ],
    buildQuery: (g, rf, s) => {
      const q: any = {
        club_id: s.clubId,
        ...dateFilter(g.dateStart, g.dateEnd, "date"),
      };
      if (rf.type && rf.type !== "all") q.type = rf.type;
      if (rf.status && rf.status !== "all") q.status = rf.status;
      return q;
    },
  },
  // ── Module: Tournaments ──
  {
    id: "tournament_revenue",
    name: "Tournament Registration Revenue",
    entity: "TournamentRegistration",
    category: "tournaments",
    module: "tournaments",
    requiresAccess: "canSeeFinance",
    defaultSort: "-registered_at",
    columns: [
      { key: "team_name", label: "Team", type: "text" },
      { key: "team_contact_name", label: "Contact", type: "text" },
      { key: "age_group", label: "Age Group", type: "text" },
      { key: "gender", label: "Gender", type: "text" },
      { key: "entry_fee", label: "Entry Fee", type: "currency", totalable: true },
      { key: "payment_status", label: "Pay Status", type: "status" },
      { key: "status", label: "Approval", type: "status" },
      { key: "registered_at", label: "Registered", type: "date" },
    ],
    buildQuery: (g, rf, s) => {
      const q: any = {
        club_id: s.clubId,
        ...dateFilter(g.dateStart, g.dateEnd, "registered_at"),
      };
      if (rf.status && rf.status !== "all") q.status = rf.status;
      if (rf.payment_status && rf.payment_status !== "all") q.payment_status = rf.payment_status;
      return q;
    },
  },
  // ── Module: Marketplace ──
  {
    id: "marketplace_sales",
    name: "Marketplace Sales",
    entity: "MarketplaceOrder",
    category: "marketplace",
    module: "marketplace",
    requiresAccess: "canSeeFinance",
    defaultSort: "-created_date",
    columns: [
      { key: "created_date", label: "Date", type: "date" },
      { key: "buyer_name", label: "Buyer", type: "text" },
      { key: "buyer_email", label: "Email", type: "text" },
      { key: "item_type", label: "Type", type: "text" },
      { key: "item_name", label: "Item", type: "text" },
      { key: "quantity", label: "Qty", type: "number", totalable: true },
      { key: "total_amount", label: "Total", type: "currency", totalable: true },
      { key: "payment_status", label: "Pay Status", type: "status" },
      { key: "status", label: "Status", type: "status" },
    ],
    buildQuery: (g, rf, s) => {
      const q: any = {
        club_id: s.clubId,
        ...dateFilter(g.dateStart, g.dateEnd, "created_date"),
      };
      if (rf.status && rf.status !== "all") q.status = rf.status;
      if (rf.payment_status && rf.payment_status !== "all") q.payment_status = rf.payment_status;
      return q;
    },
  },
  // ── Module: Player Development ──
  {
    id: "player_evaluations",
    name: "Player Evaluation History",
    entity: "PlayerEvaluation",
    category: "development",
    module: "player_development",
    requiresAccess: "canSeeRoster",
    defaultSort: "-created_date",
    columns: [
      { key: "player_name", label: "Player", type: "text" },
      { key: "team_name", label: "Team", type: "text" },
      { key: "evaluator_name", label: "Evaluator", type: "text" },
      { key: "created_date", label: "Date", type: "date" },
      { key: "overall_score", label: "Score", type: "number", totalable: true },
      { key: "category", label: "Category", type: "text" },
    ],
    buildQuery: (g, rf, s) => {
      const q: any = {
        club_id: s.clubId,
        ...idFilter(s.effBranchIds, "branch_id"),
        ...idFilter(s.effTeamIds, "team_id"),
        ...dateFilter(g.dateStart, g.dateEnd, "created_date"),
      };
      if (rf.category && rf.category !== "all") q.category = rf.category;
      return q;
    },
  },
  // ── Module: Kanban ──
  {
    id: "program_status_summary",
    name: "Program Status Summary",
    entity: "Program",
    category: "kanban",
    module: "kanban",
    requiresAccess: "canSeeRegistration",
    defaultSort: "-created_date",
    columns: [
      { key: "title", label: "Program", type: "text" },
      { key: "status", label: "Status", type: "status" },
      { key: "workstream", label: "Workstream", type: "text" },
      { key: "year", label: "Year", type: "text" },
      { key: "budget_approval", label: "Budget Approved", type: "boolean" },
      { key: "created_date", label: "Created", type: "date" },
    ],
    buildQuery: (g, rf, s) => {
      const q: any = {
        club_id: s.clubId,
        ...idFilter(s.effBranchIds, "branch_id"),
      };
      if (rf.status && rf.status !== "all") q.status = rf.status;
      return q;
    },
  },
];

export function getReportDefinitionById(id: string): ReportDefinition | undefined {
  return REPORT_DEFINITIONS.find((r) => r.id === id);
}