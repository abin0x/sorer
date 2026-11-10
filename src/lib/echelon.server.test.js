import { test, expect } from "bun:test";
import { parseEchelonResponse } from "./echelon.server";

test("reads the secure card-form address from step one", () => {
  const r = parseEchelonResponse("<response><result>1</result><result-text>Step 1 completed</result-text><form-url>https://secure.nmi.com/api/v2/three-step/abc</form-url></response>");
  expect(r.result).toBe("1");
  expect(r.formUrl).toBe("https://secure.nmi.com/api/v2/three-step/abc");
});

test("reads approval, order and amount from step three", () => {
  const r = parseEchelonResponse("<response><result>1</result><transaction-id>999</transaction-id><order-id>ord123</order-id><amount>150.00</amount></response>");
  expect([r.transactionId, r.orderId, r.amount]).toEqual(["999", "ord123", "150.00"]);
});

test("a declined card is not result 1", () => {
  expect(parseEchelonResponse("<response><result>2</result><result-text>DECLINE</result-text></response>").result).toBe("2");
});
