import { describe, it, expect } from "vitest";
import { developmentRubric, overallScore, familyCanSeeNote, familyCanSeeFeedback, familyCanSeeEvaluation } from "./developmentRubric";

describe("developmentRubric", () => {
  it("defaults to the desktop rubric: 8 technical, 14 tactical, 6 mental", () => {
    const [t, ta, m] = developmentRubric(null);
    expect(t.groups.flatMap((g) => g.items)).toHaveLength(8);
    expect(ta.groups.flatMap((g) => g.items)).toHaveLength(14);
    expect(m.groups[0].items).toHaveLength(6);
  });
  it("uses a club's own criteria when provided", () => {
    const [, , m] = developmentRubric({ mental: [{ key: "grit", label: "Grit" }] });
    expect(m.groups[0].items).toEqual([{ key: "grit", label: "Grit" }]);
  });
  it("ignores blank club criteria and keeps defaults", () => {
    const [t] = developmentRubric({ technical: [{ name: "X", items: [{ key: "", label: "" }] }] });
    expect(t.groups[0].items[0].key).toBe("first_touch");
  });
});

describe("overallScore", () => {
  it("averages all scores across sections", () => {
    expect(overallScore({ technical_scores: { a: 8 }, tactical_scores: { b: 6 }, mental_scores: { c: 7 } })).toBe(7);
  });
  it("returns null when nothing is scored", () => expect(overallScore({})).toBeNull());
});

describe("family visibility", () => {
  it("hides internal notes, draft feedback and draft evaluations", () => {
    expect(familyCanSeeNote({ visibility: "internal_only" })).toBe(false);
    expect(familyCanSeeNote({ visibility: "shared" })).toBe(true);
    expect(familyCanSeeFeedback({ status: "draft" })).toBe(false);
    expect(familyCanSeeFeedback({ status: "sent" })).toBe(true);
    expect(familyCanSeeEvaluation({ status: "draft" })).toBe(false);
  });
});
