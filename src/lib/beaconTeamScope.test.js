import { describe, it, expect } from "vitest";
import { accessibleTeams, cleanScope, inScope } from "./beaconTeamScope";

const teams = [{ id: "a" }, { id: "b" }, { id: "c" }];
describe("beacon team scope", () => {
  it("limits a coach to their own teams", () => {
    expect(accessibleTeams(teams, { teamIds: ["b"] }).map((t) => t.id)).toEqual(["b"]);
  });
  it("gives admins every team", () => {
    expect(accessibleTeams(teams, { allTeams: true })).toHaveLength(3);
  });
  it("drops selections the person can no longer access", () => {
    expect(cleanScope(["a", "z"], [{ id: "a" }])).toEqual(["a"]);
  });
  it("empty selection shows everything, otherwise only chosen teams", () => {
    expect(inScope("a", [])).toBe(true);
    expect(inScope("a", ["b"])).toBe(false);
    expect(inScope(null, ["b"])).toBe(true);
  });
});
