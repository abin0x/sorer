import { describe, it, expect } from "vitest";
import { arrivalTime, clockSeconds, clockPause, scoreChange, recapText } from "./gameDay";

describe("gameDay", () => {
  it("arrive by is 45 minutes before a 12:30 kickoff", () => {
    const a = arrivalTime("2026-10-31T12:30:00Z", 45);
    expect(a.toISOString()).toBe("2026-10-31T11:45:00.000Z");
  });
  it("running clock adds time since start to saved seconds", () => {
    const ev = { clock_elapsed_seconds: 60, clock_started_at: "2026-10-31T12:00:00Z" };
    expect(clockSeconds(ev, new Date("2026-10-31T12:00:30Z").getTime())).toBe(90);
  });
  it("pause freezes the elapsed time", () => {
    const ev = { clock_elapsed_seconds: 10, clock_started_at: "2026-10-31T12:00:00Z" };
    expect(clockPause(ev, new Date("2026-10-31T12:01:00Z").getTime())).toEqual({ clock_started_at: null, clock_elapsed_seconds: 70 });
  });
  it("-1 never goes below zero", () => {
    expect(scoreChange({ team_score: 0 }, "team", -1)).toBeNull();
    expect(scoreChange({ opponent_score: 2 }, "opponent", 1)).toEqual({ opponent_score: 3 });
  });
  it("score is locked once Final", () => {
    expect(scoreChange({ period: "final", team_score: 1 }, "team", 1)).toBeNull();
  });
  it("recap names the result", () => {
    expect(recapText({ home_team_name: "U11 Girls", opponent_name: "Midwest", team_score: 3, opponent_score: 1 })).toContain("U11 Girls 3 – 1 Midwest (Win)");
  });
});

import { claimSlot, releaseSlot, volunteerReminder, zipFrom, nearestHour, personasFor } from "./gameDay";
describe("game day phase 2", () => {
  const slots = [{ id: "s1", role: "Halftime snacks", email: null }, { id: "s2", role: "Camera / Veo", email: "a@x.com", name: "A" }];
  it("a parent can claim an open slot but not a taken one", () => {
    expect(claimSlot(slots, "s1", { email: "b@x.com" })[0].email).toBe("b@x.com");
    expect(claimSlot(slots, "s2", { email: "b@x.com" })[1].email).toBe("a@x.com");
  });
  it("only the volunteer can release their slot", () => {
    expect(releaseSlot(slots, "s2", "b@x.com")[1].email).toBe("a@x.com");
    expect(releaseSlot(slots, "s2", "a@x.com")[1].email).toBeNull();
  });
  it("reminder lists only open roles", () => {
    expect(volunteerReminder({ opponent_name: "M" }, slots)).toContain("Halftime snacks");
    expect(volunteerReminder({}, [{ id: "x", role: "r", email: "e" }])).toBeNull();
  });
  it("reads a zip from an address", () => { expect(zipFrom("123 Main St, Novi, MI 48375")).toBe("48375"); });
  it("weather uses the hour nearest kickoff", () => {
    expect(nearestHour(["2026-10-31T12:00", "2026-10-31T13:00"], "2026-10-31T12:40")).toBe(1);
  });
  it("coach who is also a parent gets both personas", () => {
    expect(personasFor({ custom_role: "coach" }, { isGuardian: true })).toEqual(["coach", "member"]);
  });
});
