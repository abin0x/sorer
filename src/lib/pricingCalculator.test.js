import { describe, it, expect } from "vitest";
import { calculatePricing, setupFeeFor, normalizePricingConfig, DEFAULT_PRICING_CONFIG } from "./pricingCalculator";

describe("pricing", () => {
  it("base license $1,995 includes the first 250 players", () => {
    const r = calculatePricing(DEFAULT_PRICING_CONFIG, { players: 250, tierKey: "fairway" });
    expect(r.ongoingAnnual).toBe(1995);
  });
  it("players above 250 are billed at the tier rate", () => {
    const r = calculatePricing(DEFAULT_PRICING_CONFIG, { players: 600, tierKey: "regatta" });
    expect(r.ongoingAnnual).toBeCloseTo(1995 + 350 * 6.95, 2);
  });
  it("tier rates are 7.95 / 6.95 / 5.95", () => {
    expect(DEFAULT_PRICING_CONFIG.tiers.map((t) => t.per_player_cost)).toEqual([7.95, 6.95, 5.95]);
  });
  it("setup is $599 for the club plus $199 per additional branch", () => {
    expect(setupFeeFor(DEFAULT_PRICING_CONFIG, 1)).toBe(599);
    expect(setupFeeFor(DEFAULT_PRICING_CONFIG, 3)).toBe(997);
  });
  it("founding clubs get setup waived", () => {
    const r = calculatePricing(DEFAULT_PRICING_CONFIG, { branches: 2, players: 100, waiveSetup: true });
    expect(r.setupTotal).toBe(0);
    expect(r.setupTotalBeforeWaiver).toBe(798);
  });
  it("founding club total is configurable", () => {
    expect(normalizePricingConfig({ founding_club_total: 25 }).founding_club_total).toBe(25);
    expect(normalizePricingConfig({}).founding_club_total).toBe(10);
  });
});
