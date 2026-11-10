import { describe, expect, it } from "vitest";
import { developmentGender, latestSkillScores, physicalAssessmentValues, skillResultValues } from "./beaconDevelopment";

describe("Beacon physical assessment entry", () => {
  it("keeps all four default test measurements as numbers", () => {
    expect(physicalAssessmentValues({ sprint_20m_seconds: "3.21", vertical_jump_inches: "22.5", agility_5_10_5_seconds: "4.62", yoyo_level: "16.2" }))
      .toEqual({ sprint_20m_seconds: 3.21, vertical_jump_inches: 22.5, agility_5_10_5_seconds: 4.62, yoyo_level: 16.2 });
  });
  it("allows one test to be logged on the sideline", () => {
    expect(physicalAssessmentValues({ sprint_20m_seconds: "3.2" })).toEqual({ sprint_20m_seconds: 3.2 });
  });
  it("rejects an empty assessment and non-positive measurements", () => {
    expect(() => physicalAssessmentValues({})).toThrow("at least one");
    expect(() => physicalAssessmentValues({ yoyo_level: "0" })).toThrow("greater than zero");
  });
});

describe("Beacon skill score entry", () => {
  it("uses the selected default test identity and numeric score", () => {
    expect(skillResultValues({ test: { id: "basic-1", title: "Around the Cone" }, score: "42.5" }))
      .toEqual({ test_id: "basic-1", test_title: "Around the Cone", score: 42.5 });
  });
  it("requires a test and a valid non-negative score", () => {
    expect(() => skillResultValues({ score: "4" })).toThrow("Choose");
    expect(() => skillResultValues({ test: { id: "t", title: "Test" }, score: "-1" })).toThrow("zero or greater");
  });
});

describe("Beacon development history", () => {
  it("selects the latest result independently for each test", () => {
    const latest = latestSkillScores([
      { test_id: "a", test_date: "2026-01-01", score: 10 },
      { test_id: "a", test_date: "2026-02-01", score: 20 },
      { test_id: "b", test_date: "2026-01-15", score: 30 },
    ]);
    expect(latest.get("a").score).toBe(20);
    expect(latest.get("b").score).toBe(30);
  });
  it("maps team gender labels to benchmark keys", () => {
    expect(developmentGender({ gender: "Girls" })).toBe("female");
    expect(developmentGender({ gender: "Boys" })).toBe("male");
    expect(developmentGender({})).toBe("all");
  });
});
