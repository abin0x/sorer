import { describe, expect, test } from "bun:test";
import { gradeForRole } from "./roleRating.js";
import { TEAM_ROLES } from "./playerRetention.js";

describe("gradeForRole", () => {
  test("top role is a 5", () => expect(gradeForRole(TEAM_ROLES, "indispensable")).toBe(5));
  test("bottom role is a 1", () => expect(gradeForRole(TEAM_ROLES, "third_team_squad")).toBe(1));
  test("first team starter outranks second team starter", () =>
    expect(gradeForRole(TEAM_ROLES, "first_team_starter")).toBeGreaterThan(gradeForRole(TEAM_ROLES, "second_team_starter")));
  test("unknown role is ungraded", () => expect(gradeForRole(TEAM_ROLES, "nope")).toBe(0));
});
