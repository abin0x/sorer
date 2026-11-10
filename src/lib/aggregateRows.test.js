import { describe, it, expect } from "vitest";
import { aggregateRows } from "./aggregateRows";

describe("aggregateRows", () => {
  const recs = [
    { amount: "100", branch_name: "North", payment_date: "2026-01-05" },
    { amount: 50, branch_name: "South", payment_date: "2026-01-20" },
    { amount: 25, branch_name: "North", payment_date: "2026-02-02" },
  ];
  it("sums totals without grouping", () => {
    expect(aggregateRows(recs, { sum: "amount" }).rows[0]).toMatchObject({ count: 3, sum_amount: 175 });
  });
  it("returns a zero row for empty totals", () => {
    expect(aggregateRows([], { sum: ["a", "b"] }).rows[0]).toMatchObject({ count: 0, sum_a: 0, sum_b: 0 });
  });
  it("buckets by month in order", () => {
    const rows = aggregateRows(recs, { dateBucket: { field: "payment_date", unit: "month" }, sum: "amount" }).rows;
    expect(rows.map((r) => [r._id, r.sum_amount])).toEqual([["2026-01", 150], ["2026-02", 25]]);
  });
  it("groups and sorts descending", () => {
    const rows = aggregateRows(recs, { groupBy: "branch_name", sum: "amount", sort: "-sum_amount" }).rows;
    expect(rows.map((r) => [r.branch_name, r.sum_amount, r.count])).toEqual([["North", 125, 2], ["South", 50, 1]]);
  });
});
