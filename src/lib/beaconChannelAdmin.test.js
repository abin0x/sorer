import { expect, test } from "bun:test";
import { canManageChannels, isCustomChannel } from "./beaconChannelAdmin.js";

const teams = [{ id: "t1", team_manager_ids: ["u1"] }, { id: "t2", team_manager_id: "u2" }];

test("club admins manage club and team channels", () => {
  expect(canManageChannels({ custom_role: "club_admin" }, null, teams)).toBe(true);
  expect(canManageChannels({ custom_role: "club_admin" }, "t2", teams)).toBe(true);
});
test("team managers manage only their own team's channels", () => {
  const u = { id: "u1", custom_role: "team_manager" };
  expect(canManageChannels(u, "t1", teams)).toBe(true);
  expect(canManageChannels(u, "t2", teams)).toBe(false);
  expect(canManageChannels(u, null, teams)).toBe(false);
});
test("parents and coaches cannot manage channels", () => {
  expect(canManageChannels({ id: "u1", custom_role: "parent_guardian" }, "t1", teams)).toBe(false);
  expect(canManageChannels({ id: "u1", custom_role: "coach" }, "t1", teams)).toBe(false);
});
test("only custom channels can be deleted", () => {
  expect(isCustomChannel({ created_by: "a@x.com" })).toBe(true);
  expect(isCustomChannel({ name: "Team Chat" })).toBe(false);
});
