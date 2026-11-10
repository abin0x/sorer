// Shared installment-plan helpers used by the checkout flow (to set up the
// initial schedule) and the daily billing workflow (to advance due dates).

// Returns the next due date for a given frequency, as a YYYY-MM-DD string.
// monthly  → +1 month, quarterly → +3 months, seasonal → +6 months.
export function nextInstallmentDate(currentDateStr, frequency) {
  const d = new Date(currentStrToDate(currentDateStr));
  const freq = (frequency || "monthly").toLowerCase();
  if (freq === "quarterly") d.setMonth(d.getMonth() + 3);
  else if (freq === "seasonal") d.setMonth(d.getMonth() + 6);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

function currentStrToDate(s) {
  // Accept YYYY-MM-DD or full ISO; return a local-date Date.
  if (!s) return new Date();
  const dateOnly = String(s).split("T")[0];
  const parts = dateOnly.split("-").map(Number);
  if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
  return new Date(s);
}

// Builds the initial installment schedule for a registration/invite given the
// total amount, installment count, and frequency. Returns the fields to write.
export function buildInstallmentPlan(totalAmount, installmentCount, frequency, startDate) {
  const count = Math.max(1, Number(installmentCount) || 1);
  const amount = Math.round((Number(totalAmount) || 0) / count * 100) / 100;
  const start = startDate || new Date().toISOString().split("T")[0];
  return {
    installment_count: count,
    installment_amount: amount,
    installments_paid: 0,
    next_installment_date: start,
  };
}