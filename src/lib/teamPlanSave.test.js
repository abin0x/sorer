import { describe, it, expect } from "bun:test";
import { saveTeamPlanRecord } from "./teamPlanSave.js";

describe("team plan persistence", () => {
  it("updates the original plan when editing instead of creating a duplicate", async () => {
    const calls = [];
    const entity = { update: async (id, payload) => { calls.push(["update", id, payload]); return { id, ...payload }; }, create: async () => { throw new Error("Duplicate plan"); } };
    const result = await saveTeamPlanRecord(entity, { id: "tp-1" }, { team_name: "Demo FC U12 revised" });
    expect(calls).toEqual([["update", "tp-1", { team_name: "Demo FC U12 revised" }]]);
    expect(result.id).toBe("tp-1");
  });
  it("creates a distinct plan for a copy without an id", async () => {
    const entity = { create: async (payload) => ({ id: "tp-2", ...payload }), update: async () => { throw new Error("Changed original"); } };
    const result = await saveTeamPlanRecord(entity, {}, { team_name: "Demo FC U12 (Copy)" });
    expect(result.id).toBe("tp-2");
  });
});