import { test, expect } from "bun:test";
import { isPublicLegacyAction } from "./legacyPublicActions";
test("families can finish an Echelon payment without signing in", () => {
  expect(isPublicLegacyAction("echelon-complete", { action: "complete" })).toBe(true);
});
test("installment charging is not public", () => {
  expect(isPublicLegacyAction("charge-installments", {})).toBe(false);
});
