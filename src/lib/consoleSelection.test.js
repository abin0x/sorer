import { describe, it, expect } from "bun:test";
import { resolveConsoleClub } from "./consoleSelection.js";

describe("system console club selection", () => {
  const clubs = [{ id: "club-a" }, { id: "club-b" }];
  it("selects the chosen tenant instead of the first club", () => {
    expect(resolveConsoleClub(clubs, "club-b")?.id).toBe("club-b");
  });
  it("recovers when the previously selected club is no longer available", () => {
    expect(resolveConsoleClub(clubs, "removed-club")?.id).toBe("club-a");
  });
  it("has no selected club when the club list is empty", () => {
    expect(resolveConsoleClub([], "club-b")).toBeNull();
  });
});