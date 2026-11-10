import { describe, expect, test } from "bun:test";
import { financialSummary, invoiceCandidates, isCollected, isLate, nextInvoiceNumber, normalizePaymentStatus, payablesDue } from "./financeLedger";

describe("finance ledger rules", () => {
  test("older status names count as their standard meaning", () => {
    expect(normalizePaymentStatus("paid")).toBe("paid_in_full");
    expect(normalizePaymentStatus("overdue")).toBe("past_due");
    expect(isCollected({ status: "paid" })).toBe(true);
    expect(isLate({ status: "overdue" })).toBe(true);
    expect(isCollected({ status: "paid_in_full", is_refund: true })).toBe(false);
  });

  test("invoices only bill the part of a balance not already on the ledger", () => {
    const regs = [
      { id: "r1", amount_due: 3400, amount_paid: 1700 },
      { id: "r2", amount_due: 3400, amount_paid: 3400 },
      { id: "r3", amount_due: 2000, amount_paid: 0 },
    ];
    const payments = [
      { source_id: "r1", amount: 850, status: "scheduled" },
      { source_id: "r1", amount: 850, status: "past_due" },
      { source_id: "r3", amount: 500, status: "scheduled" },
    ];
    const rows = invoiceCandidates(regs, payments);
    expect(rows.map((r) => r.registration.id)).toEqual(["r1", "r3"]);
    expect(rows[0].unbilled).toBe(0);
    expect(rows[1].unbilled).toBe(1500);
  });

  test("net position is collected money minus paid bills, staff pay and refunds", () => {
    const s = financialSummary({
      payments: [{ amount: 1000, status: "paid_in_full" }, { amount: 200, status: "paid_in_full", is_refund: true }, { amount: 300, status: "scheduled" }],
      expenses: [{ amount: 250, payment_status: "paid" }, { amount: 100, payment_status: "to_be_paid", status: "approved" }],
      staffPays: [{ amount: 150, payment_status: "paid" }],
    });
    expect(s.cashIn).toBe(1000);
    expect(s.cashOut).toBe(600);
    expect(s.net).toBe(400);
    expect(s.payables).toBe(100);
  });

  test("unpaid staff pay and bills past their date are overdue", () => {
    const d = payablesDue({
      expenses: [{ amount: 10, date: "2026-11-01", payment_status: "to_be_paid" }, { amount: 5, date: "2026-11-05", payment_status: "to_be_paid" }],
      staffPays: [{ amount: 20, date: "2026-10-31", payment_status: "to_be_paid" }, { amount: 30, date: "2026-10-31", payment_status: "paid" }],
    }, "2026-11-03");
    expect(d.overdue.length).toBe(2);
    expect(d.dueThisWeek.length).toBe(1);
    expect(d.total).toBe(35);
  });

  test("invoice numbers continue from the highest one issued", () => {
    expect(nextInvoiceNumber([])).toBe("INV-1001");
    expect(nextInvoiceNumber(["INV-1004", "INV-1002"])).toBe("INV-1005");
  });
});
