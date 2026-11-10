// Shared money rules for the bookkeeper command center, payments page and invoices.
// Pure functions so every screen counts the same dollars the same way.

const STATUS_ALIASES = {
  paid: "paid_in_full",
  succeeded: "paid_in_full",
  overdue: "past_due",
  failed: "payment_failed",
  pending: "scheduled",
  invoiced: "scheduled",
};

export const COLLECTED_STATUSES = ["paid_in_full", "active"];
export const LATE_STATUSES = ["past_due", "payment_failed"];
export const SCHEDULED_STATUSES = ["scheduled", "pending_setup"];

export function normalizePaymentStatus(status) {
  const s = String(status || "").toLowerCase();
  return STATUS_ALIASES[s] || s;
}

const cents = (n) => Math.round((Number(n) || 0) * 100);
const dollars = (c) => c / 100;
const day = (v) => String(v || "").slice(0, 10);

export function isCollected(p) { return !p?.is_refund && COLLECTED_STATUSES.includes(normalizePaymentStatus(p?.status)); }
export function isLate(p) { return !p?.is_refund && LATE_STATUSES.includes(normalizePaymentStatus(p?.status)); }
export function isScheduled(p) { return !p?.is_refund && SCHEDULED_STATUSES.includes(normalizePaymentStatus(p?.status)); }

/** Unpaid bills and staff pay, split by when they are due. */
export function payablesDue({ expenses = [], staffPays = [] }, today) {
  const open = [
    ...expenses.filter((e) => e.payment_status !== "paid" && e.status !== "rejected").map((e) => ({ ...e, kind: "expense" })),
    ...staffPays.filter((s) => s.payment_status !== "paid").map((s) => ({ ...s, kind: "staff_pay" })),
  ];
  const weekAhead = new Date(Date.parse(`${today}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10);
  const overdue = open.filter((r) => r.date && day(r.date) < today);
  const dueThisWeek = open.filter((r) => r.date && day(r.date) >= today && day(r.date) <= weekAhead);
  const total = dollars(open.reduce((s, r) => s + cents(r.amount), 0));
  return { open, overdue, dueThisWeek, total };
}

/**
 * Family balances that still need billing. A registration's balance is what is
 * owed minus what was paid; charges already on the ledger (scheduled or late)
 * count as billed, so generating invoices never bills the same dollars twice.
 */
export function invoiceCandidates(registrations = [], payments = []) {
  const billedBySource = new Map();
  payments.forEach((p) => {
    if (!p.source_id || !(isScheduled(p) || isLate(p))) return;
    billedBySource.set(p.source_id, (billedBySource.get(p.source_id) || 0) + cents(p.amount));
  });
  return registrations
    .filter((r) => r.status !== "cancelled" && r.status !== "rejected")
    .map((r) => {
      const balance = Math.max(0, cents(r.amount_due) - cents(r.amount_paid));
      const billed = Math.min(balance, billedBySource.get(r.id) || 0);
      return { registration: r, balance: dollars(balance), billed: dollars(billed), unbilled: dollars(balance - billed) };
    })
    .filter((row) => row.balance > 0);
}

/** Cash position: collected money in, paid money out, and what is still coming or owed. */
export function financialSummary({ payments = [], expenses = [], staffPays = [] }) {
  const cashIn = payments.filter(isCollected).reduce((s, p) => s + cents(p.amount), 0);
  const refunds = payments.filter((p) => p.is_refund).reduce((s, p) => s + Math.abs(cents(p.amount)), 0);
  const expensePaid = expenses.filter((e) => e.payment_status === "paid").reduce((s, e) => s + cents(e.amount), 0);
  const staffPaid = staffPays.filter((s) => s.payment_status === "paid").reduce((s, p) => s + cents(p.amount), 0);
  const scheduled = payments.filter(isScheduled).reduce((s, p) => s + cents(p.amount), 0);
  const late = payments.filter(isLate).reduce((s, p) => s + cents(p.amount), 0);
  const payables = expenses.filter((e) => e.payment_status !== "paid" && e.status !== "rejected").reduce((s, e) => s + cents(e.amount), 0)
    + staffPays.filter((s) => s.payment_status !== "paid").reduce((s, p) => s + cents(p.amount), 0);
  const cashOut = expensePaid + staffPaid + refunds;
  return {
    cashIn: dollars(cashIn),
    cashOut: dollars(cashOut),
    net: dollars(cashIn - cashOut),
    refunds: dollars(refunds),
    expensePaid: dollars(expensePaid),
    staffPaid: dollars(staffPaid),
    scheduled: dollars(scheduled),
    late: dollars(late),
    payables: dollars(payables),
    projectedNet: dollars(cashIn - cashOut + scheduled + late - payables),
  };
}

/** Month-by-month money in and out (YYYY-MM keys, oldest first). */
export function monthlyCashFlow({ payments = [], expenses = [], staffPays = [] }) {
  const months = new Map();
  const add = (date, field, amount) => {
    const m = day(date).slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(m)) return;
    if (!months.has(m)) months.set(m, { month: m, in: 0, out: 0 });
    months.get(m)[field] += cents(amount);
  };
  payments.filter(isCollected).forEach((p) => add(p.payment_date || p.created_date, "in", p.amount));
  expenses.filter((e) => e.payment_status === "paid").forEach((e) => add(e.date, "out", e.amount));
  staffPays.filter((s) => s.payment_status === "paid").forEach((s) => add(s.date, "out", s.amount));
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({ month: m.month, in: dollars(m.in), out: dollars(m.out), net: dollars(m.in - m.out) }));
}

export function nextInvoiceNumber(existing = [], prefix = "INV") {
  const max = existing.reduce((n, v) => {
    const m = String(v || "").match(/(\d+)$/);
    return m ? Math.max(n, Number(m[1])) : n;
  }, 1000);
  return `${prefix}-${max + 1}`;
}
