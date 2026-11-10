// Shared constants and calculation helpers for the Coach & Staff Expenses feature.

export const STATUS_LABELS = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In Review",
  approved: "Approved",
  returned: "Returned",
  rejected: "Rejected",
  exported_to_quickbooks: "Exported to QuickBooks",
  paid: "Paid",
};

export const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  in_review: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  returned: "bg-orange-100 text-orange-700 border-orange-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  exported_to_quickbooks: "bg-purple-100 text-purple-700 border-purple-200",
  paid: "bg-teal-100 text-teal-700 border-teal-200",
};

// Reports an approver needs to act on.
export const APPROVAL_QUEUE_STATUSES = ["submitted", "in_review"];

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function calcLineAmount(line, expenseType) {
  if (!expenseType) return round2(line.amount);
  if (expenseType.calculation_method === "mileage") {
    return round2((Number(line.miles) || 0) * (Number(line.rate_used) || 0));
  }
  if (expenseType.calculation_method === "per_diem") {
    return round2((Number(line.days) || 0) * (Number(line.rate_used) || 0));
  }
  return round2(line.amount);
}

/** Split an amount evenly across teams, correcting rounding drift on the last share. */
export function splitEvenly(amount, teams) {
  if (!teams.length) return [];
  const total = round2(amount);
  const share = round2(total / teams.length);
  return teams.map((t, i) => ({
    team_id: t.id,
    team_name: t.name,
    amount: i === teams.length - 1 ? round2(total - share * (teams.length - 1)) : share,
  }));
}

export function receiptRequired(expenseType, amount) {
  if (!expenseType?.receipt_required) return false;
  const threshold = Number(expenseType.receipt_threshold) || 0;
  return threshold === 0 || Number(amount) > threshold;
}

/** Build a fresh empty line. Allocations are computed at save time from the report's teams. */
export function emptyLineWithDefaults(reportLocation) {
  return {
    id: `tmp-${Math.random().toString(36).slice(2)}`,
    line_date: new Date().toISOString().split("T")[0],
    description: "",
    expense_type_id: "",
    expense_type_name: "",
    calculation_method: "flat",
    amount: 0,
    allocations: [],
    receipts: [],
    location: reportLocation || "",
  };
}

/** Evenly split a line amount across the report's selected teams (for QuickBooks Class billing). */
export function computeLineAllocations(amount, teamIds, allTeams) {
  const teams = (allTeams || []).filter((t) => (teamIds || []).includes(t.id));
  if (!teams.length) return [];
  return splitEvenly(amount, teams);
}

export function canEditReport(report) {
  return !report || report.status === "draft" || report.status === "returned";
}

// Default expense types seeded for every club that has none yet.
export const DEFAULT_EXPENSE_TYPES = [
  { name: "Coaching Convention", calculation_method: "flat", rate: 0, receipt_required: true, receipt_threshold: 0 },
  { name: "Air Travel", calculation_method: "flat", rate: 0, receipt_required: true, receipt_threshold: 0 },
  { name: "Hotel", calculation_method: "flat", rate: 0, receipt_required: true, receipt_threshold: 0 },
  { name: "Meals", calculation_method: "flat", rate: 0, receipt_required: true, receipt_threshold: 25 },
  { name: "Mileage", calculation_method: "mileage", rate: 0.25, receipt_required: false, receipt_threshold: 0 },
  { name: "Misc", calculation_method: "flat", rate: 0, receipt_required: true, receipt_threshold: 0 },
  { name: "Rental Car", calculation_method: "flat", rate: 0, receipt_required: true, receipt_threshold: 0 },
  { name: "MLS Per Diem", calculation_method: "per_diem", rate: 50, receipt_required: false, receipt_threshold: 0 },
  { name: "Other", calculation_method: "flat", rate: 0, receipt_required: false, receipt_threshold: 0 },
];