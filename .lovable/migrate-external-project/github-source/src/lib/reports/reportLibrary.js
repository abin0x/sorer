import {
  DollarSign, Wallet, CreditCard, Users, ClipboardList,
  Trophy, CalendarCheck, Receipt, BarChart3,
  MapPin, ShoppingBag, Activity, LayoutDashboard,
} from "lucide-react";

// ── Query helpers (shared by all report buildQuery functions) ──

export function idFilter(ids, field) {
  if (ids === null || ids === undefined) return {};
  return { [field]: { $in: ids } };
}

export function dateFilter(start, end, field) {
  if (!start && !end) return {};
  const q = {};
  if (start) q[field] = { ...q[field], $gte: start };
  if (end) q[field] = { ...q[field], $lte: end };
  return q;
}

// ── Categories ──

export const REPORT_CATEGORIES = [
  { key: "finance", label: "Finance", icon: DollarSign, accessFlag: "canSeeFinance" },
  { key: "registration", label: "Registration & Rosters", icon: Users, accessFlag: "canSeeRegistration" },
  { key: "tryouts", label: "Tryouts", icon: Trophy, accessFlag: "canSeeTryouts" },
  { key: "events", label: "Events & Camps", icon: CalendarCheck, accessFlag: "canSeeRegistration" },
  { key: "expenses", label: "Expenses", icon: Receipt, accessFlag: "canSeeFinance" },
  { key: "facilities", label: "Facilities", icon: MapPin, accessFlag: "canSeeFinance", module: "facility_management" },
  { key: "tournaments", label: "Tournaments", icon: Trophy, accessFlag: "canSeeFinance", module: "tournaments" },
  { key: "marketplace", label: "Marketplace", icon: ShoppingBag, accessFlag: "canSeeFinance", module: "marketplace" },
  { key: "development", label: "Player Development", icon: Activity, accessFlag: "canSeeRoster", module: "player_development" },
  { key: "kanban", label: "Kanban & Programs", icon: LayoutDashboard, accessFlag: "canSeeRegistration", module: "kanban" },
];

// ── Report definitions ──

export const REPORTS = [
  // ── Finance ──
  {
    id: "payments_received",
    name: "Payments Received",
    description: "All payments collected, with method, processor, and status. Totals match the Payments Ledger.",
    category: "finance",
    icon: DollarSign,
    entity: "Payment",
    requiresAccess: "canSeeFinance",
    defaultSort: "-payment_date",
    buildQuery: (g, rf, s) => {
      const q = {
        club_id: s.clubId,
        ...idFilter(s.effBranchIds, "branch_id"),
        ...idFilter(s.effTeamIds, "team_id"),
        ...dateFilter(g.dateStart, g.dateEnd, "payment_date"),
        is_refund: false,
      };
      if (rf.status && rf.status !== "all") q.status = rf.status;
      if (rf.payment_method && rf.payment_method !== "all") q.payment_method = rf.payment_method;
      if (rf.charge_type && rf.charge_type !== "all") q.charge_type = rf.charge_type;
      if (rf.include_refunds === "yes") delete q.is_refund;
      return q;
    },
    columns: [
      { key: "payment_date", label: "Date", type: "date", defaultVisible: true, sortable: true },
      { key: "player_name", label: "Player", type: "text", defaultVisible: true },
      { key: "guardian_name", label: "Guardian", type: "text", defaultVisible: true },
      { key: "family_email", label: "Email", type: "text", defaultVisible: false },
      { key: "source_label", label: "Source", type: "text", defaultVisible: true },
      { key: "team_name", label: "Team", type: "text", defaultVisible: true, groupable: true },
      { key: "branch_name", label: "Branch", type: "text", defaultVisible: true, groupable: true },
      { key: "amount", label: "Amount", type: "currency", defaultVisible: true, totalable: true, sortable: true },
      { key: "net_amount", label: "Net", type: "currency", defaultVisible: false, totalable: true, sortable: true },
      { key: "payment_method", label: "Method", type: "text", defaultVisible: true, groupable: true },
      { key: "processor_name", label: "Processor", type: "text", defaultVisible: false, groupable: true },
      { key: "status", label: "Status", type: "status", defaultVisible: true, groupable: true },
      { key: "charge_type", label: "Charge Type", type: "text", defaultVisible: false, groupable: true },
    ],
    reportFilters: [
      { key: "status", label: "Status", type: "select", options: ["not_started", "pending_setup", "active", "paid_in_full", "past_due", "payment_failed", "on_hold", "waived", "refunded", "cancelled"] },
      { key: "payment_method", label: "Method", type: "select", options: ["card", "ach", "cash", "check", "other"] },
      { key: "charge_type", label: "Charge Type", type: "select", options: ["dues", "event", "spiritwear", "other"] },
      { key: "include_refunds", label: "Include Refunds", type: "select", options: ["no", "yes"] },
    ],
  },
  {
    id: "outstanding_balances",
    name: "Outstanding Balances & Aging",
    description: "Unpaid registrations with balance due, broken down by aging bucket.",
    category: "finance",
    icon: Wallet,
    entity: "Registration",
    requiresAccess: "canSeeFinance",
    defaultSort: "-next_installment_date",
    buildQuery: (g, rf, s) => {
      const q = {
        club_id: s.clubId,
        ...idFilter(s.effBranchIds, "location_id"),
        ...idFilter(s.effTeamIds, "team_id"),
        payment_status: { $ne: "paid" },
        ...dateFilter(g.dateStart, g.dateEnd, "registration_date"),
      };
      if (rf.payment_status && rf.payment_status !== "all") q.payment_status = rf.payment_status;
      if (rf.aging && rf.aging !== "all") {
        const today = new Date().toISOString().split("T")[0];
        const d30 = new Date(Date.now() - 30 * 864e5).toISOString().split("T")[0];
        const d60 = new Date(Date.now() - 60 * 864e5).toISOString().split("T")[0];
        if (rf.aging === "0-30") q.next_installment_date = { $gte: d30, $lt: today };
        else if (rf.aging === "31-60") q.next_installment_date = { $gte: d60, $lt: d30 };
        else if (rf.aging === "61+") q.next_installment_date = { $lt: d60 };
        else if (rf.aging === "overdue") q.next_installment_date = { $lt: today };
      }
      return q;
    },
    columns: [
      { key: "player_name", label: "Player", type: "text", defaultVisible: true },
      { key: "guardian_name", label: "Guardian", type: "text", defaultVisible: true },
      { key: "program_title", label: "Program", type: "text", defaultVisible: false },
      { key: "team_name", label: "Team", type: "text", defaultVisible: true, groupable: true },
      { key: "location_name", label: "Branch", type: "text", defaultVisible: true, groupable: true },
      { key: "amount_due", label: "Due", type: "currency", defaultVisible: true, totalable: true, sortable: true },
      { key: "amount_paid", label: "Paid", type: "currency", defaultVisible: true, totalable: true, sortable: true },
      { key: "balance", label: "Balance", type: "currency", defaultVisible: true, totalable: true, compute: (r) => (r.amount_due || 0) - (r.amount_paid || 0) },
      { key: "next_installment_date", label: "Next Due", type: "date", defaultVisible: true, sortable: true },
      { key: "payment_status", label: "Pay Status", type: "status", defaultVisible: true, groupable: true },
      { key: "installment_count", label: "Installments", type: "number", defaultVisible: false },
      { key: "installments_paid", label: "Paid #", type: "number", defaultVisible: false },
      { key: "autopay_enabled", label: "Autopay", type: "boolean", defaultVisible: false },
    ],
    reportFilters: [
      { key: "payment_status", label: "Pay Status", type: "select", options: ["unpaid", "partial", "refunded"] },
      { key: "aging", label: "Aging", type: "select", options: ["0-30", "31-60", "61+", "overdue"] },
    ],
  },
  {
    id: "dues_payment_plans",
    name: "Dues & Payment-Plan Status",
    description: "Registrations with installment plans, showing progress and autopay status.",
    category: "finance",
    icon: CreditCard,
    entity: "Registration",
    requiresAccess: "canSeeFinance",
    defaultSort: "-next_installment_date",
    buildQuery: (g, rf, s) => {
      const q = {
        club_id: s.clubId,
        ...idFilter(s.effBranchIds, "location_id"),
        ...idFilter(s.effTeamIds, "team_id"),
        installment_count: { $gt: 0 },
        ...dateFilter(g.dateStart, g.dateEnd, "registration_date"),
      };
      if (rf.payment_status && rf.payment_status !== "all") q.payment_status = rf.payment_status;
      if (rf.autopay === "yes") q.autopay_enabled = true;
      else if (rf.autopay === "no") q.autopay_enabled = false;
      return q;
    },
    columns: [
      { key: "player_name", label: "Player", type: "text", defaultVisible: true },
      { key: "guardian_name", label: "Guardian", type: "text", defaultVisible: true },
      { key: "team_name", label: "Team", type: "text", defaultVisible: true, groupable: true },
      { key: "amount_due", label: "Total Due", type: "currency", defaultVisible: true, totalable: true },
      { key: "amount_paid", label: "Paid", type: "currency", defaultVisible: true, totalable: true },
      { key: "balance", label: "Balance", type: "currency", defaultVisible: true, totalable: true, compute: (r) => (r.amount_due || 0) - (r.amount_paid || 0) },
      { key: "installment_count", label: "Installments", type: "number", defaultVisible: true },
      { key: "installments_paid", label: "Paid #", type: "number", defaultVisible: true },
      { key: "installment_amount", label: "Installment Amt", type: "currency", defaultVisible: true, totalable: true },
      { key: "next_installment_date", label: "Next Due", type: "date", defaultVisible: true, sortable: true },
      { key: "autopay_enabled", label: "Autopay", type: "boolean", defaultVisible: true, groupable: true },
      { key: "payment_status", label: "Pay Status", type: "status", defaultVisible: true, groupable: true },
    ],
    reportFilters: [
      { key: "payment_status", label: "Pay Status", type: "select", options: ["unpaid", "partial", "paid", "refunded"] },
      { key: "autopay", label: "Autopay", type: "select", options: ["yes", "no"] },
    ],
  },

  // ── Registration & Rosters ──
  {
    id: "registrations_breakdown",
    name: "Registrations by Season / Team / Platform",
    description: "All registrations with status, payment, and team assignment.",
    category: "registration",
    icon: ClipboardList,
    entity: "Registration",
    requiresAccess: "canSeeRegistration",
    defaultSort: "-registration_date",
    buildQuery: (g, rf, s) => {
      const q = {
        club_id: s.clubId,
        ...idFilter(s.effBranchIds, "location_id"),
        ...idFilter(s.effTeamIds, "team_id"),
        ...dateFilter(g.dateStart, g.dateEnd, "registration_date"),
      };
      if (rf.status && rf.status !== "all") q.status = rf.status;
      if (rf.payment_status && rf.payment_status !== "all") q.payment_status = rf.payment_status;
      return q;
    },
    columns: [
      { key: "player_name", label: "Player", type: "text", defaultVisible: true },
      { key: "guardian_name", label: "Guardian", type: "text", defaultVisible: true },
      { key: "program_title", label: "Program", type: "text", defaultVisible: true, groupable: true },
      { key: "team_name", label: "Team", type: "text", defaultVisible: true, groupable: true },
      { key: "location_name", label: "Branch", type: "text", defaultVisible: true, groupable: true },
      { key: "registration_date", label: "Date", type: "date", defaultVisible: true, sortable: true },
      { key: "status", label: "Status", type: "status", defaultVisible: true, groupable: true },
      { key: "payment_status", label: "Pay Status", type: "status", defaultVisible: true, groupable: true },
      { key: "amount_due", label: "Due", type: "currency", defaultVisible: false, totalable: true },
      { key: "amount_paid", label: "Paid", type: "currency", defaultVisible: false, totalable: true },
    ],
    reportFilters: [
      { key: "status", label: "Status", type: "select", options: ["pending", "approved", "rejected", "waitlisted", "cancelled"] },
      { key: "payment_status", label: "Pay Status", type: "select", options: ["unpaid", "partial", "paid", "refunded"] },
    ],
  },
  {
    id: "team_rosters",
    name: "Team Rosters",
    description: "All teams with roster size, capacity, coaches, and status.",
    category: "registration",
    icon: Users,
    entity: "Team",
    requiresAccess: "canSeeRoster",
    defaultSort: "name",
    buildQuery: (g, rf, s) => {
      const q = {
        club_id: s.clubId,
        ...idFilter(s.effBranchIds, "location_id"),
        ...idFilter(s.effTeamIds, "id"),
        ...(g.seasonName ? { season: g.seasonName } : {}),
        ...(g.platformId ? { platform_id: g.platformId } : {}),
      };
      if (rf.status && rf.status !== "all") q.status = rf.status;
      if (rf.age_group && rf.age_group !== "all") q.age_group = rf.age_group;
      if (rf.gender && rf.gender !== "all") q.gender = rf.gender;
      return q;
    },
    columns: [
      { key: "name", label: "Team", type: "text", defaultVisible: true, sortable: true, groupable: true },
      { key: "age_group", label: "Age", type: "text", defaultVisible: true, groupable: true },
      { key: "gender", label: "Gender", type: "text", defaultVisible: true, groupable: true },
      { key: "platform_name", label: "Platform", type: "text", defaultVisible: true, groupable: true },
      { key: "season", label: "Season", type: "text", defaultVisible: false, groupable: true },
      { key: "league", label: "League", type: "text", defaultVisible: false },
      { key: "coach_names", label: "Coaches", type: "array", defaultVisible: true },
      { key: "team_manager_names", label: "Managers", type: "array", defaultVisible: false },
      { key: "max_roster_size", label: "Capacity", type: "number", defaultVisible: true, totalable: true },
      { key: "player_count", label: "Rostered", type: "number", defaultVisible: true, totalable: true, compute: (r) => (r.player_ids || []).length },
      { key: "location_name", label: "Branch", type: "text", defaultVisible: true, groupable: true },
      { key: "status", label: "Status", type: "status", defaultVisible: true, groupable: true },
    ],
    reportFilters: [
      { key: "status", label: "Status", type: "select", options: ["draft", "planned", "active", "skipped", "merged", "retired"] },
      { key: "gender", label: "Gender", type: "select", options: ["Boys", "Girls", "Boys and Girls"] },
    ],
  },

  // ── Tryouts ──
  {
    id: "tryout_funnel",
    name: "Tryout Funnel & Evaluation Summary",
    description: "Tryout events with registration, check-in, evaluation, and offer counts.",
    category: "tryouts",
    icon: Trophy,
    entity: "TryoutEvent",
    requiresAccess: "canSeeTryouts",
    defaultSort: "-date",
    buildQuery: (g, rf, s) => {
      const q = {
        club_id: s.clubId,
        ...dateFilter(g.dateStart, g.dateEnd, "date"),
      };
      if (rf.type && rf.type !== "all") q.type = rf.type;
      if (rf.stage && rf.stage !== "all") q.stage = rf.stage;
      return q;
    },
    columns: [
      { key: "date", label: "Date", type: "date", defaultVisible: true, sortable: true },
      { key: "type", label: "Type", type: "text", defaultVisible: true, groupable: true },
      { key: "location", label: "Location", type: "text", defaultVisible: true, groupable: true },
      { key: "registration_count", label: "Registered", type: "number", defaultVisible: true, totalable: true, sortable: true },
      { key: "checked_in_count", label: "Checked In", type: "number", defaultVisible: true, totalable: true },
      { key: "evaluated_count", label: "Evaluated", type: "number", defaultVisible: true, totalable: true },
      { key: "offered_count", label: "Offered", type: "number", defaultVisible: true, totalable: true },
      { key: "accepted_count", label: "Accepted", type: "number", defaultVisible: true, totalable: true },
      { key: "stage", label: "Stage", type: "status", defaultVisible: true, groupable: true },
    ],
    reportFilters: [
      { key: "type", label: "Type", type: "select", options: ["main_tryout", "open_training", "supplemental_tryout"] },
      { key: "stage", label: "Stage", type: "select", options: ["planned", "in_progress", "ready", "completed", "post_tryout"] },
    ],
  },

  // ── Events & Camps ──
  {
    id: "event_signups",
    name: "Event & Camp Signups and Revenue",
    description: "Event registrations with payment status and revenue totals.",
    category: "events",
    icon: CalendarCheck,
    entity: "EventRegistration",
    requiresAccess: "canSeeRegistration",
    defaultSort: "-registered_date",
    buildQuery: (g, rf, s) => {
      const q = {
        club_id: s.clubId,
        ...dateFilter(g.dateStart, g.dateEnd, "registered_date"),
      };
      if (rf.status && rf.status !== "all") q.status = rf.status;
      if (rf.payment_status && rf.payment_status !== "all") q.payment_status = rf.payment_status;
      return q;
    },
    columns: [
      { key: "event_name", label: "Event", type: "text", defaultVisible: true, groupable: true },
      { key: "player_name", label: "Participant", type: "text", defaultVisible: true },
      { key: "guardian_name", label: "Guardian", type: "text", defaultVisible: true },
      { key: "guardian_email", label: "Email", type: "text", defaultVisible: false },
      { key: "registered_date", label: "Date", type: "date", defaultVisible: true, sortable: true },
      { key: "status", label: "Status", type: "status", defaultVisible: true, groupable: true },
      { key: "amount_due", label: "Due", type: "currency", defaultVisible: true, totalable: true },
      { key: "amount_paid", label: "Paid", type: "currency", defaultVisible: true, totalable: true },
      { key: "payment_status", label: "Pay Status", type: "status", defaultVisible: true, groupable: true },
    ],
    reportFilters: [
      { key: "status", label: "Status", type: "select", options: ["registered", "waitlist", "cancelled", "attended"] },
      { key: "payment_status", label: "Pay Status", type: "select", options: ["unpaid", "paid", "partial", "refunded", "free"] },
    ],
  },

  // ── Expenses ──
  {
    id: "expense_reports",
    name: "Expense Reports by Status / Team / Type",
    description: "All expenses with approval status, payment status, and category.",
    category: "expenses",
    icon: Receipt,
    entity: "Expense",
    requiresAccess: "canSeeFinance",
    defaultSort: "-date",
    buildQuery: (g, rf, s) => {
      const q = {
        club_id: s.clubId,
        ...idFilter(s.effBranchIds, "branch_id"),
        ...dateFilter(g.dateStart, g.dateEnd, "date"),
      };
      if (rf.status && rf.status !== "all") q.status = rf.status;
      if (rf.payment_status && rf.payment_status !== "all") q.payment_status = rf.payment_status;
      if (rf.category && rf.category !== "all") q.category = rf.category;
      return q;
    },
    columns: [
      { key: "description", label: "Description", type: "text", defaultVisible: true },
      { key: "amount", label: "Amount", type: "currency", defaultVisible: true, totalable: true, sortable: true },
      { key: "date", label: "Date", type: "date", defaultVisible: true, sortable: true },
      { key: "category", label: "Category", type: "text", defaultVisible: true, groupable: true },
      { key: "payment_status", label: "Pay Status", type: "status", defaultVisible: true, groupable: true },
      { key: "status", label: "Approval", type: "status", defaultVisible: true, groupable: true },
      { key: "branch_id", label: "Branch ID", type: "text", defaultVisible: false, groupable: true },
      { key: "assigned_to", label: "Assigned To", type: "text", defaultVisible: false },
      { key: "approved_by", label: "Approved By", type: "text", defaultVisible: false },
      { key: "approval_date", label: "Approval Date", type: "date", defaultVisible: false },
    ],
    reportFilters: [
      { key: "status", label: "Approval", type: "select", options: ["pending", "approved", "rejected"] },
      { key: "payment_status", label: "Pay Status", type: "select", options: ["to_be_paid", "paid"] },
    ],
  },

  // ── Facilities (module: facility_management) ──
  {
    id: "field_utilization",
    name: "Field Utilization",
    description: "Bookings by field, day, and type. Shows utilization hours and gaps.",
    category: "facilities",
    module: "facility_management",
    icon: MapPin,
    entity: "Booking",
    requiresAccess: "canSeeFinance",
    defaultSort: "-date",
    buildQuery: (g, rf, s) => {
      const q = {
        club_id: s.clubId,
        ...dateFilter(g.dateStart, g.dateEnd, "date"),
      };
      if (rf.type && rf.type !== "all") q.type = rf.type;
      if (rf.status && rf.status !== "all") q.status = rf.status;
      return q;
    },
    columns: [
      { key: "date", label: "Date", type: "date", defaultVisible: true, sortable: true },
      { key: "day", label: "Day", type: "text", defaultVisible: true, groupable: true },
      { key: "field_name", label: "Field", type: "text", defaultVisible: true, groupable: true },
      { key: "facility_name", label: "Facility", type: "text", defaultVisible: true, groupable: true },
      { key: "start_time", label: "Start", type: "text", defaultVisible: true },
      { key: "end_time", label: "End", type: "text", defaultVisible: true },
      { key: "type", label: "Type", type: "text", defaultVisible: true, groupable: true },
      { key: "team_name", label: "Team", type: "text", defaultVisible: true, groupable: true },
      { key: "status", label: "Status", type: "status", defaultVisible: true, groupable: true },
    ],
    reportFilters: [
      { key: "type", label: "Type", type: "select", options: ["training", "game", "camp", "class", "goalkeeping", "small group", "other"] },
      { key: "status", label: "Status", type: "select", options: ["pending", "confirmed", "cancelled"] },
    ],
  },

  // ── Tournaments (module: tournaments) ──
  {
    id: "tournament_revenue",
    name: "Tournament Registration Revenue",
    description: "Tournament registrations with entry fees, payment status, and approval.",
    category: "tournaments",
    module: "tournaments",
    icon: Trophy,
    entity: "TournamentRegistration",
    requiresAccess: "canSeeFinance",
    defaultSort: "-registered_at",
    buildQuery: (g, rf, s) => {
      const q = {
        club_id: s.clubId,
        ...dateFilter(g.dateStart, g.dateEnd, "registered_at"),
      };
      if (rf.status && rf.status !== "all") q.status = rf.status;
      if (rf.payment_status && rf.payment_status !== "all") q.payment_status = rf.payment_status;
      return q;
    },
    columns: [
      { key: "team_name", label: "Team", type: "text", defaultVisible: true, groupable: true },
      { key: "team_contact_name", label: "Contact", type: "text", defaultVisible: true },
      { key: "age_group", label: "Age Group", type: "text", defaultVisible: true, groupable: true },
      { key: "gender", label: "Gender", type: "text", defaultVisible: true, groupable: true },
      { key: "entry_fee", label: "Entry Fee", type: "currency", defaultVisible: true, totalable: true, sortable: true },
      { key: "payment_status", label: "Pay Status", type: "status", defaultVisible: true, groupable: true },
      { key: "status", label: "Approval", type: "status", defaultVisible: true, groupable: true },
      { key: "registered_at", label: "Registered", type: "date", defaultVisible: true, sortable: true },
    ],
    reportFilters: [
      { key: "status", label: "Approval", type: "select", options: ["pending", "approved", "waitlist", "rejected"] },
      { key: "payment_status", label: "Pay Status", type: "select", options: ["pending", "paid", "refunded", "failed"] },
    ],
  },

  // ── Marketplace (module: marketplace) ──
  {
    id: "marketplace_sales",
    name: "Marketplace Sales",
    description: "Marketplace orders with item, quantity, revenue, and payment status.",
    category: "marketplace",
    module: "marketplace",
    icon: ShoppingBag,
    entity: "MarketplaceOrder",
    requiresAccess: "canSeeFinance",
    defaultSort: "-created_date",
    buildQuery: (g, rf, s) => {
      const q = {
        club_id: s.clubId,
        ...dateFilter(g.dateStart, g.dateEnd, "created_date"),
      };
      if (rf.status && rf.status !== "all") q.status = rf.status;
      if (rf.payment_status && rf.payment_status !== "all") q.payment_status = rf.payment_status;
      return q;
    },
    columns: [
      { key: "created_date", label: "Date", type: "date", defaultVisible: true, sortable: true },
      { key: "buyer_name", label: "Buyer", type: "text", defaultVisible: true },
      { key: "buyer_email", label: "Email", type: "text", defaultVisible: false },
      { key: "item_type", label: "Type", type: "text", defaultVisible: true, groupable: true },
      { key: "item_name", label: "Item", type: "text", defaultVisible: true, groupable: true },
      { key: "quantity", label: "Qty", type: "number", defaultVisible: true, totalable: true },
      { key: "total_amount", label: "Total", type: "currency", defaultVisible: true, totalable: true, sortable: true },
      { key: "payment_status", label: "Pay Status", type: "status", defaultVisible: true, groupable: true },
      { key: "status", label: "Status", type: "status", defaultVisible: true, groupable: true },
    ],
    reportFilters: [
      { key: "status", label: "Status", type: "select", options: ["pending", "completed", "cancelled", "refunded"] },
      { key: "payment_status", label: "Pay Status", type: "select", options: ["pending", "paid", "refunded", "failed"] },
    ],
  },

  // ── Player Development (module: player_development) ──
  {
    id: "player_evaluations",
    name: "Player Evaluation History",
    description: "All player evaluations with scores, evaluators, and dates.",
    category: "development",
    module: "player_development",
    icon: Activity,
    entity: "PlayerEvaluation",
    requiresAccess: "canSeeRoster",
    defaultSort: "-created_date",
    buildQuery: (g, rf, s) => {
      const q = {
        club_id: s.clubId,
        ...idFilter(s.effBranchIds, "branch_id"),
        ...idFilter(s.effTeamIds, "team_id"),
        ...dateFilter(g.dateStart, g.dateEnd, "created_date"),
      };
      if (rf.category && rf.category !== "all") q.category = rf.category;
      return q;
    },
    columns: [
      { key: "player_name", label: "Player", type: "text", defaultVisible: true, groupable: true },
      { key: "team_name", label: "Team", type: "text", defaultVisible: true, groupable: true },
      { key: "evaluator_name", label: "Evaluator", type: "text", defaultVisible: true },
      { key: "created_date", label: "Date", type: "date", defaultVisible: true, sortable: true },
      { key: "overall_score", label: "Score", type: "number", defaultVisible: true, totalable: true, sortable: true },
      { key: "category", label: "Category", type: "text", defaultVisible: true, groupable: true },
    ],
    reportFilters: [],
  },

  // ── Kanban & Programs (module: kanban) ──
  {
    id: "program_status_summary",
    name: "Program Status Summary",
    description: "All programs with status, workstream, year, and budget approval.",
    category: "kanban",
    module: "kanban",
    icon: LayoutDashboard,
    entity: "Program",
    requiresAccess: "canSeeRegistration",
    defaultSort: "-created_date",
    buildQuery: (g, rf, s) => {
      const q = {
        club_id: s.clubId,
        ...idFilter(s.effBranchIds, "branch_id"),
      };
      if (rf.status && rf.status !== "all") q.status = rf.status;
      return q;
    },
    columns: [
      { key: "title", label: "Program", type: "text", defaultVisible: true, sortable: true },
      { key: "status", label: "Status", type: "status", defaultVisible: true, groupable: true },
      { key: "workstream", label: "Workstream", type: "text", defaultVisible: true, groupable: true },
      { key: "year", label: "Year", type: "text", defaultVisible: true, groupable: true },
      { key: "budget_approval", label: "Budget Approved", type: "boolean", defaultVisible: true, groupable: true },
      { key: "created_date", label: "Created", type: "date", defaultVisible: true, sortable: true },
    ],
    reportFilters: [
      { key: "status", label: "Status", type: "select", options: ["draft", "active", "on_hold", "completed", "cancelled"] },
    ],
  },
];

export function getReportById(id) {
  return REPORTS.find((r) => r.id === id);
}

export function getReportsForAccess(access, hasModule) {
  return REPORTS.filter((r) => {
    if (!access[r.requiresAccess]) return false;
    if (r.module && hasModule && !hasModule(r.module)) return false;
    return true;
  });
}