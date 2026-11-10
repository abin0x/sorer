import {
  Users, UserCircle, ClipboardList, DollarSign, Shield,
  Trophy, CalendarCheck, Receipt, MapPin, Activity,
} from "lucide-react";
import { applyAdvancedFilters } from "./advancedFilters";

// ── Generic query builder for custom data sources ──

export function buildCustomQuery(ds, g, rf, s) {
  const q = { club_id: s.clubId };

  // Branch scope
  if (s.effBranchIds && ds.scopeFields?.branch) {
    q[ds.scopeFields.branch] = { $in: s.effBranchIds };
  }
  // Team scope
  if (s.effTeamIds && ds.scopeFields?.team) {
    q[ds.scopeFields.team] = { $in: s.effTeamIds };
  }
  // Season
  if (g.seasonName && ds.seasonField) {
    q[ds.seasonField] = g.seasonName;
  }
  // Date range
  if (g.dateStart && ds.dateField) {
    q[ds.dateField] = { ...q[ds.dateField], $gte: g.dateStart };
  }
  if (g.dateEnd && ds.dateField) {
    q[ds.dateField] = { ...q[ds.dateField], $lte: g.dateEnd };
  }
  // Platform
  if (g.platformId && ds.platformField) {
    q[ds.platformField] = g.platformId;
  }
  // Custom filters
  for (const f of ds.filters || []) {
    const val = rf[f.key];
    if (val != null && val !== "" && val !== "all") {
      if (f.type === "text") {
        q[f.key] = { $regex: val, $options: "i" };
      } else if (f.type === "boolean") {
        q[f.key] = val === "true" || val === true;
      } else {
        q[f.key] = val;
      }
    }
  }
  const allowed = ds.fieldGroups.flatMap((grp) => grp.fields).filter((f) => !f.compute).map((f) => f.key);
  return applyAdvancedFilters(q, rf.__advanced, allowed);
}

// ── Build a synthetic report definition from a data source + selected fields ──

export function buildSyntheticReport(ds, selectedFieldKeys) {
  const allFields = ds.fieldGroups.flatMap((g) => g.fields);
  const columns = selectedFieldKeys
    .map((key) => allFields.find((f) => f.key === key))
    .filter(Boolean);
  return {
    id: `custom:${ds.key}`,
    name: ds.label,
    entity: ds.entity,
    columns,
    defaultSort: ds.defaultSort,
    buildQuery: (g, rf, s) => buildCustomQuery(ds, g, rf, s),
    reportFilters: ds.filters || [],
  };
}

// ── Data source definitions ──

export const CUSTOM_DATA_SOURCES = [
  {
    key: "player",
    label: "Players",
    icon: Users,
    entity: "Player",
    requiresAccess: "canSeeRoster",
    defaultSort: "last_name",
    scopeFields: { branch: "location_id", team: "team_id" },
    seasonField: "season",
    fieldGroups: [
      {
        label: "Player Demographics",
        fields: [
          { key: "first_name", label: "First Name", type: "text", sortable: true, defaultVisible: true },
          { key: "last_name", label: "Last Name", type: "text", sortable: true, defaultVisible: true },
          { key: "date_of_birth", label: "Date of Birth", type: "date", sortable: true, defaultVisible: true },
          { key: "gender", label: "Gender", type: "text", groupable: true, defaultVisible: true },
          { key: "age_group", label: "Age Group", type: "text", groupable: true, defaultVisible: true },
          { key: "position", label: "Position", type: "text", groupable: true },
          { key: "jersey_number", label: "Jersey #", type: "text" },
          { key: "status", label: "Status", type: "status", groupable: true, defaultVisible: true },
        ],
      },
      {
        label: "Team Information",
        fields: [
          { key: "team_name", label: "Team", type: "text", groupable: true, defaultVisible: true },
          { key: "location_name", label: "Branch", type: "text", groupable: true, defaultVisible: true },
          { key: "league", label: "League", type: "text", groupable: true },
          { key: "coach_name", label: "Coach", type: "text", groupable: true },
          { key: "season", label: "Season", type: "text", groupable: true },
        ],
      },
      {
        label: "Program Information",
        fields: [
          { key: "program_title", label: "Program", type: "text", groupable: true },
        ],
      },
      {
        label: "Guardian Information",
        fields: [
          { key: "guardian_name", label: "Guardian", type: "text", defaultVisible: true },
        ],
      },
      {
        label: "Internal",
        fields: [
          { key: "unique_id", label: "Unique ID", type: "text" },
          { key: "notes", label: "Notes", type: "text" },
          { key: "source", label: "Source", type: "text", groupable: true },
        ],
      },
    ],
    filters: [
      { key: "status", label: "Status", type: "select", options: ["active", "inactive", "waitlist", "pending"] },
      { key: "gender", label: "Gender", type: "select", options: ["Boys", "Girls"] },
      { key: "last_name", label: "Last Name", type: "text" },
    ],
  },

  {
    key: "guardian",
    label: "Guardians",
    icon: UserCircle,
    entity: "Guardian",
    requiresAccess: "canSeeRoster",
    defaultSort: "last_name",
    scopeFields: {},
    fieldGroups: [
      {
        label: "Guardian Demographics",
        fields: [
          { key: "first_name", label: "First Name", type: "text", sortable: true, defaultVisible: true },
          { key: "last_name", label: "Last Name", type: "text", sortable: true, defaultVisible: true },
          { key: "email", label: "Email", type: "text", defaultVisible: true },
          { key: "phone", label: "Phone", type: "text", defaultVisible: true },
          { key: "relationship", label: "Relationship", type: "text", groupable: true },
        ],
      },
      {
        label: "Address",
        fields: [
          { key: "street_address", label: "Address", type: "text" },
          { key: "city", label: "City", type: "text", groupable: true },
          { key: "state", label: "State", type: "text", groupable: true },
          { key: "zip_code", label: "ZIP", type: "text" },
          { key: "country", label: "Country", type: "text", groupable: true },
        ],
      },
      {
        label: "Emergency Contact",
        fields: [
          { key: "emergency_contact_name", label: "Emergency Name", type: "text" },
          { key: "emergency_contact_phone", label: "Emergency Phone", type: "text" },
        ],
      },
      {
        label: "Internal",
        fields: [
          { key: "household_id", label: "Household ID", type: "text", groupable: true },
          { key: "is_test_user", label: "Test User", type: "boolean", groupable: true },
          { key: "unique_id", label: "Unique ID", type: "text" },
          { key: "notes", label: "Notes", type: "text" },
        ],
      },
    ],
    filters: [
      { key: "relationship", label: "Relationship", type: "select", options: ["mother", "father", "guardian", "other"] },
      { key: "is_test_user", label: "Test Users", type: "boolean" },
      { key: "last_name", label: "Last Name", type: "text" },
    ],
  },

  {
    key: "registration",
    label: "Registrations",
    icon: ClipboardList,
    entity: "Registration",
    requiresAccess: "canSeeRegistration",
    defaultSort: "-registration_date",
    scopeFields: { branch: "location_id", team: "team_id" },
    dateField: "registration_date",
    fieldGroups: [
      {
        label: "Player & Guardian",
        fields: [
          { key: "player_name", label: "Player", type: "text", sortable: true, defaultVisible: true },
          { key: "guardian_name", label: "Guardian", type: "text", defaultVisible: true },
        ],
      },
      {
        label: "Program & Team",
        fields: [
          { key: "program_title", label: "Program", type: "text", groupable: true, defaultVisible: true },
          { key: "team_name", label: "Team", type: "text", groupable: true, defaultVisible: true },
          { key: "location_name", label: "Branch", type: "text", groupable: true, defaultVisible: true },
        ],
      },
      {
        label: "Status",
        fields: [
          { key: "status", label: "Reg Status", type: "status", groupable: true, defaultVisible: true },
          { key: "payment_status", label: "Pay Status", type: "status", groupable: true, defaultVisible: true },
        ],
      },
      {
        label: "Payment",
        fields: [
          { key: "amount_due", label: "Amount Due", type: "currency", totalable: true, sortable: true },
          { key: "amount_paid", label: "Amount Paid", type: "currency", totalable: true, sortable: true },
          { key: "installment_count", label: "Installments", type: "number" },
          { key: "installments_paid", label: "Installments Paid", type: "number" },
          { key: "installment_amount", label: "Installment Amt", type: "currency", totalable: true },
          { key: "next_payment_date", label: "Next Due", type: "date", sortable: true },
          { key: "autopay_enabled", label: "Autopay", type: "boolean", groupable: true },
          { key: "promo_code", label: "Promo Code", type: "text", groupable: true },
          { key: "discount_amount", label: "Discount", type: "currency", totalable: true },
        ],
      },
      {
        label: "Dates",
        fields: [
          { key: "registration_date", label: "Reg Date", type: "date", sortable: true, defaultVisible: true },
          { key: "next_payment_date", label: "Next Payment", type: "date", sortable: true },
        ],
      },
      {
        label: "Flags",
        fields: [
          { key: "waiver_accepted", label: "Waiver", type: "boolean", groupable: true },
          { key: "paperwork_complete", label: "Paperwork", type: "boolean", groupable: true },
          { key: "financial_aid_requested", label: "Fin. Aid", type: "boolean", groupable: true },
        ],
      },
      {
        label: "Internal",
        fields: [
          { key: "assigned_to", label: "Assigned To", type: "text", groupable: true },
          { key: "unique_id", label: "Unique ID", type: "text" },
          { key: "notes", label: "Notes", type: "text" },
        ],
      },
    ],
    filters: [
      { key: "status", label: "Reg Status", type: "select", options: ["pending", "approved", "rejected", "waitlisted", "cancelled"] },
      { key: "payment_status", label: "Pay Status", type: "select", options: ["unpaid", "partial", "paid", "refunded"] },
      { key: "autopay_enabled", label: "Autopay", type: "boolean" },
    ],
  },

  {
    key: "payment",
    label: "Payments",
    icon: DollarSign,
    entity: "Payment",
    requiresAccess: "canSeeFinance",
    defaultSort: "-payment_date",
    scopeFields: { branch: "branch_id", team: "team_id" },
    dateField: "payment_date",
    fieldGroups: [
      {
        label: "Payment Details",
        fields: [
          { key: "payment_date", label: "Date", type: "date", sortable: true, defaultVisible: true },
          { key: "amount", label: "Amount", type: "currency", totalable: true, sortable: true, defaultVisible: true },
          { key: "net_amount", label: "Net", type: "currency", totalable: true, sortable: true },
          { key: "payment_method", label: "Method", type: "text", groupable: true, defaultVisible: true },
          { key: "status", label: "Status", type: "status", groupable: true, defaultVisible: true },
          { key: "charge_type", label: "Charge Type", type: "text", groupable: true },
        ],
      },
      {
        label: "Source",
        fields: [
          { key: "source_type", label: "Source Type", type: "text", groupable: true },
          { key: "source_label", label: "Source", type: "text", defaultVisible: true },
        ],
      },
      {
        label: "Player & Team",
        fields: [
          { key: "player_name", label: "Player", type: "text", defaultVisible: true },
          { key: "guardian_name", label: "Guardian", type: "text" },
          { key: "family_email", label: "Email", type: "text" },
          { key: "team_name", label: "Team", type: "text", groupable: true, defaultVisible: true },
          { key: "branch_name", label: "Branch", type: "text", groupable: true, defaultVisible: true },
        ],
      },
      {
        label: "Processor",
        fields: [
          { key: "processor_name", label: "Processor", type: "text", groupable: true },
          { key: "transaction_reference", label: "Transaction Ref", type: "text" },
          { key: "stripe_fee", label: "Stripe Fee", type: "currency", totalable: true },
        ],
      },
      {
        label: "QuickBooks",
        fields: [
          { key: "qbo_entry_type", label: "QBO Entry", type: "text", groupable: true },
        ],
      },
      {
        label: "Internal",
        fields: [
          { key: "is_refund", label: "Refund", type: "boolean", groupable: true },
          { key: "promo_code", label: "Promo Code", type: "text", groupable: true },
          { key: "recorded_by", label: "Recorded By", type: "text", groupable: true },
          { key: "notes", label: "Notes", type: "text" },
        ],
      },
    ],
    filters: [
      { key: "status", label: "Status", type: "select", options: ["not_started", "pending_setup", "active", "paid_in_full", "past_due", "payment_failed", "on_hold", "waived", "refunded", "cancelled"] },
      { key: "payment_method", label: "Method", type: "select", options: ["card", "ach", "cash", "check", "other"] },
      { key: "charge_type", label: "Charge Type", type: "select", options: ["dues", "event", "spiritwear", "other"] },
      { key: "is_refund", label: "Refunds", type: "boolean" },
    ],
  },

  {
    key: "team",
    label: "Teams",
    icon: Shield,
    entity: "Team",
    requiresAccess: "canSeeRoster",
    defaultSort: "name",
    scopeFields: { branch: "location_id", team: "id" },
    seasonField: "season",
    platformField: "platform_id",
    fieldGroups: [
      {
        label: "Team Info",
        fields: [
          { key: "name", label: "Team", type: "text", sortable: true, groupable: true, defaultVisible: true },
          { key: "age_group", label: "Age Group", type: "text", groupable: true, defaultVisible: true },
          { key: "gender", label: "Gender", type: "text", groupable: true, defaultVisible: true },
          { key: "playing_format", label: "Format", type: "text", groupable: true },
          { key: "season", label: "Season", type: "text", groupable: true },
          { key: "league", label: "League", type: "text", groupable: true },
          { key: "platform_name", label: "Platform", type: "text", groupable: true, defaultVisible: true },
        ],
      },
      {
        label: "Staff",
        fields: [
          { key: "coach_names", label: "Coaches", type: "array", defaultVisible: true },
          { key: "team_manager_names", label: "Managers", type: "array" },
        ],
      },
      {
        label: "Roster",
        fields: [
          { key: "max_roster_size", label: "Capacity", type: "number", totalable: true, defaultVisible: true },
          { key: "player_count", label: "Rostered", type: "number", totalable: true, compute: (r) => (r.player_ids || []).length, defaultVisible: true },
        ],
      },
      {
        label: "Location & Status",
        fields: [
          { key: "location_name", label: "Branch", type: "text", groupable: true, defaultVisible: true },
          { key: "status", label: "Status", type: "status", groupable: true, defaultVisible: true },
          { key: "cost", label: "Cost", type: "currency", totalable: true },
        ],
      },
      {
        label: "Internal",
        fields: [
          { key: "unique_id", label: "Unique ID", type: "text" },
          { key: "notes", label: "Notes", type: "text" },
        ],
      },
    ],
    filters: [
      { key: "status", label: "Status", type: "select", options: ["draft", "planned", "active", "skipped", "merged", "retired"] },
      { key: "gender", label: "Gender", type: "select", options: ["Boys", "Girls", "Boys and Girls"] },
    ],
  },

  {
    key: "tryout_registration",
    label: "Tryout Registrations",
    icon: Trophy,
    entity: "TryoutRegistration",
    requiresAccess: "canSeeTryouts",
    defaultSort: "-registered_date",
    dateField: "registered_date",
    fieldGroups: [
      {
        label: "Player & Guardian",
        fields: [
          { key: "player_name", label: "Player", type: "text", sortable: true, defaultVisible: true },
          { key: "guardian_name", label: "Guardian", type: "text", defaultVisible: true },
          { key: "guardian_email", label: "Email", type: "text", defaultVisible: true },
          { key: "guardian_phone", label: "Phone", type: "text" },
        ],
      },
      {
        label: "Event",
        fields: [
          { key: "desired_age_group", label: "Age Group", type: "text", groupable: true, defaultVisible: true },
          { key: "registered_date", label: "Registered", type: "date", sortable: true, defaultVisible: true },
        ],
      },
      {
        label: "Status",
        fields: [
          { key: "status", label: "Status", type: "status", groupable: true, defaultVisible: true },
          { key: "checked_in", label: "Checked In", type: "boolean", groupable: true },
          { key: "attended", label: "Attended", type: "boolean", groupable: true },
        ],
      },
      {
        label: "Internal",
        fields: [
          { key: "check_in_code", label: "Check-in Code", type: "text" },
          { key: "source", label: "Source", type: "text", groupable: true },
          { key: "notes", label: "Notes", type: "text" },
        ],
      },
    ],
    filters: [
      { key: "status", label: "Status", type: "select", options: ["registered", "waitlist", "checked_in", "no_show"] },
      { key: "source", label: "Source", type: "select", options: ["inside", "outside"] },
      { key: "player_name", label: "Player Name", type: "text" },
    ],
  },

  {
    key: "event_registration",
    label: "Event Registrations",
    icon: CalendarCheck,
    entity: "EventRegistration",
    requiresAccess: "canSeeRegistration",
    defaultSort: "-registered_date",
    dateField: "registered_date",
    fieldGroups: [
      {
        label: "Event & Participant",
        fields: [
          { key: "event_name", label: "Event", type: "text", groupable: true, defaultVisible: true },
          { key: "player_name", label: "Participant", type: "text", defaultVisible: true },
          { key: "guardian_name", label: "Guardian", type: "text", defaultVisible: true },
          { key: "guardian_email", label: "Email", type: "text" },
        ],
      },
      {
        label: "Dates & Status",
        fields: [
          { key: "registered_date", label: "Registered", type: "date", sortable: true, defaultVisible: true },
          { key: "status", label: "Status", type: "status", groupable: true, defaultVisible: true },
        ],
      },
      {
        label: "Payment",
        fields: [
          { key: "amount_due", label: "Amount Due", type: "currency", totalable: true },
          { key: "amount_paid", label: "Amount Paid", type: "currency", totalable: true },
          { key: "payment_status", label: "Pay Status", type: "status", groupable: true, defaultVisible: true },
        ],
      },
    ],
    filters: [
      { key: "status", label: "Status", type: "select", options: ["registered", "waitlist", "cancelled", "attended"] },
      { key: "payment_status", label: "Pay Status", type: "select", options: ["unpaid", "paid", "partial", "refunded", "free"] },
    ],
  },

  {
    key: "expense",
    label: "Expenses",
    icon: Receipt,
    entity: "Expense",
    requiresAccess: "canSeeFinance",
    defaultSort: "-date",
    scopeFields: { branch: "branch_id" },
    dateField: "date",
    fieldGroups: [
      {
        label: "Details",
        fields: [
          { key: "description", label: "Description", type: "text", defaultVisible: true },
          { key: "amount", label: "Amount", type: "currency", totalable: true, sortable: true, defaultVisible: true },
          { key: "date", label: "Date", type: "date", sortable: true, defaultVisible: true },
          { key: "category", label: "Category", type: "text", groupable: true, defaultVisible: true },
        ],
      },
      {
        label: "Status",
        fields: [
          { key: "status", label: "Approval", type: "status", groupable: true, defaultVisible: true },
          { key: "payment_status", label: "Pay Status", type: "status", groupable: true, defaultVisible: true },
        ],
      },
      {
        label: "Assignment",
        fields: [
          { key: "assigned_to", label: "Assigned To", type: "text", groupable: true },
          { key: "approved_by", label: "Approved By", type: "text", groupable: true },
          { key: "approval_date", label: "Approval Date", type: "date" },
          { key: "approval_notes", label: "Approval Notes", type: "text" },
        ],
      },
      {
        label: "Internal",
        fields: [
          { key: "unique_id", label: "Unique ID", type: "text" },
        ],
      },
    ],
    filters: [
      { key: "status", label: "Approval", type: "select", options: ["pending", "approved", "rejected"] },
      { key: "payment_status", label: "Pay Status", type: "select", options: ["to_be_paid", "paid"] },
    ],
  },

  {
    key: "booking",
    label: "Field Bookings",
    icon: MapPin,
    entity: "Booking",
    requiresAccess: "canSeeFinance",
    defaultSort: "-date",
    dateField: "date",
    fieldGroups: [
      {
        label: "Schedule",
        fields: [
          { key: "date", label: "Date", type: "date", sortable: true, defaultVisible: true },
          { key: "day", label: "Day", type: "text", groupable: true },
          { key: "start_time", label: "Start", type: "text", defaultVisible: true },
          { key: "end_time", label: "End", type: "text", defaultVisible: true },
        ],
      },
      {
        label: "Field",
        fields: [
          { key: "field_name", label: "Field", type: "text", groupable: true, defaultVisible: true },
          { key: "facility_name", label: "Facility", type: "text", groupable: true, defaultVisible: true },
        ],
      },
      {
        label: "Type & Team",
        fields: [
          { key: "type", label: "Type", type: "text", groupable: true, defaultVisible: true },
          { key: "team_name", label: "Team", type: "text", groupable: true, defaultVisible: true },
          { key: "away_team_name", label: "Away Team", type: "text" },
          { key: "coach_name", label: "Coach", type: "text", groupable: true },
          { key: "platform_name", label: "Platform", type: "text", groupable: true },
        ],
      },
      {
        label: "Status",
        fields: [
          { key: "status", label: "Status", type: "status", groupable: true, defaultVisible: true },
          { key: "referee_name", label: "Referee", type: "text" },
          { key: "notified", label: "Notified", type: "boolean", groupable: true },
        ],
      },
    ],
    filters: [
      { key: "type", label: "Type", type: "select", options: ["training", "game", "camp", "class", "goalkeeping", "small group", "other"] },
      { key: "status", label: "Status", type: "select", options: ["pending", "confirmed", "cancelled"] },
    ],
  },
];

export function getDataSourceByKey(key) {
  return CUSTOM_DATA_SOURCES.find((ds) => ds.key === key);
}

export function getDataSourcesForAccess(access) {
  return CUSTOM_DATA_SOURCES.filter((ds) => access[ds.requiresAccess]);
}