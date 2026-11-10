/**
 * Shared fee-template logic: amount computation and installment schedule
 * generation. Used by create-obligations-from-roster so the same rules apply
 * wherever obligations are created.
 */

export function computeObligationAmount(template, opts = {}) {
  const { siblingRank = 0, isStaffChild = false } = opts;
  if (isStaffChild && template.staff_child_exempt) return 0;

  let amount = Number(template.amount) || 0;

  // Early bird: applies when the obligation is created on/before the cutoff.
  const today = new Date().toISOString().slice(0, 10);
  if (
    template.early_bird_until &&
    Number(template.early_bird_discount_percent) > 0 &&
    today <= template.early_bird_until
  ) {
    amount = amount * (1 - Number(template.early_bird_discount_percent) / 100);
  }

  // Sibling discount: 2nd+ sibling in the same family/season.
  if (siblingRank > 0 && Number(template.sibling_discount_percent) > 0) {
    amount = amount * (1 - Number(template.sibling_discount_percent) / 100);
  }

  return Math.round(amount * 100) / 100;
}

/**
 * Build a list of installment schedule items for an obligation.
 * Returns [] for one-time (count <= 1).
 */
export function buildSchedule(amount, installmentCount, interval, firstDueDate) {
  const count = Number(installmentCount) || 0;
  if (count <= 1 || !firstDueDate) return [];

  const per = Math.round((amount / count) * 100) / 100;
  const items = [];
  const start = new Date(firstDueDate + "T00:00:00");
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    if (interval === "quarterly") d.setMonth(d.getMonth() + i * 3);
    else if (interval === "seasonal") d.setMonth(d.getMonth() + i * 4);
    else d.setMonth(d.getMonth() + i); // monthly
    items.push({
      installment_number: i + 1,
      amount: per,
      due_date: d.toISOString().slice(0, 10),
      status: "scheduled",
    });
  }
  return items;
}