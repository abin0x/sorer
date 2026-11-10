import { describe, it, expect } from "bun:test";
import { buildTriageItems } from "./triageBriefing.js";

const all = { overdue: true, retention: true, expenses: true };

describe("triage briefing", () => {
  it("flags 90+ day overdue balances as critical and lists them first", () => {
    const items = buildTriageItems({
      include: all,
      overdue: { openCases: 3, totalOutstanding: 1200, buckets: { "90+": { count: 1 } } },
      pendingExpenses: [{ amount: 50 }],
    });
    expect(items.map((i) => i.key)).toEqual(["overdue", "expenses"]);
    expect(items[0].severity).toBe("critical");
  });

  it("only counts at-risk or leaving players that are not resolved, and hides them without staff permission", () => {
    const retentionMap = {
      a: { review: { intent: "leaving" } },
      b: { review: { intent: "at_risk", follow_up_status: "resolved" } },
      c: { review: { intent: "returning" } },
    };
    const [item] = buildTriageItems({ include: all, retentionMap, retentionAllowed: true });
    expect(item.title).toBe("1 player at risk or leaving");
    expect(buildTriageItems({ include: all, retentionMap, retentionAllowed: false })).toEqual([]);
  });

  it("omits sections a role does not include", () => {
    const items = buildTriageItems({ include: { overdue: true }, pendingExpenses: [{ amount: 10 }] });
    expect(items).toEqual([]);
  });
});
