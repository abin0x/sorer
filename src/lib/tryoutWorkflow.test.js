import { describe, it, expect } from "bun:test";
import { teamPlanForTeam, tryoutSetupChecklist, resolveTeamPlanTeamId } from "./tryoutWorkflow.js";

describe("club-specific tryout guidance", () => {
  it("does not count another club's plan as team readiness", () => {
    expect(teamPlanForTeam([{ team_id: "t1", club_id: "foreign", status: "active" }], "t1", "eclipse")).toBeNull();
  });
  it("does not count templates as saved team plans", () => {
    expect(teamPlanForTeam([{ team_id: "t1", club_id: "eclipse", is_template: true }], "t1", "eclipse")).toBeNull();
  });
  it("counts only this club's main date and active team dues", () => {
    const rows = tryoutSetupChecklist({ clubId: "eclipse", plans: [{ id: "p1", club_id: "eclipse", team_ids: ["t1"] }, { id: "p2", club_id: "foreign", team_ids: ["t2"] }], events: [{ tryout_plan_id: "p1", club_id: "foreign", type: "main_tryout" }], teamPlans: [{ club_id: "eclipse", team_id: "t1", status: "draft" }] });
    expect(rows.map((r) => r.done)).toEqual([true, false, true, false]);
  });
  it("keeps the explicitly selected team even when another team has the same name", () => {
    expect(resolveTeamPlanTeamId({ team_id: "t2", team_name: "U12" }, [{ id: "t1", name: "U12", club_id: "eclipse" }, { id: "t2", name: "U12", club_id: "eclipse" }], "eclipse")).toBe("t2");
  });
  it("rejects a team from another club", () => {
    expect(() => resolveTeamPlanTeamId({ team_id: "t2" }, [{ id: "t2", club_id: "foreign" }], "eclipse")).toThrow("does not belong");
  });
});