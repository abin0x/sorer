import { describe, it, expect } from "vitest";
import { applyAdvancedFilters } from "./advancedFilters";

describe("applyAdvancedFilters", () => {
  const base = { club_id: "c1" };
  it("ignores fields the data source does not declare", () => {
    expect(applyAdvancedFilters(base, [{ field: "club_id", op: "equals", value: "other" }], ["gender"])).toEqual(base);
  });
  it("combines a date range on one field", () => {
    const q = applyAdvancedFilters(base, [
      { field: "date_of_birth", op: "gte", value: "2010-01-01" },
      { field: "date_of_birth", op: "lte", value: "2010-12-31" },
    ], ["date_of_birth"]);
    expect(q.date_of_birth).toEqual({ $gte: "2010-01-01", $lte: "2010-12-31" });
  });
  it("skips rows missing a required value and supports empty checks", () => {
    const q = applyAdvancedFilters(base, [
      { field: "position", op: "equals", value: "" },
      { field: "guardian_name", op: "not_set" },
    ], ["position", "guardian_name"]);
    expect(q).toEqual({ club_id: "c1", guardian_name: { $exists: false } });
  });
});
