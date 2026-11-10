import { describe, it, expect } from "bun:test";
import { searchTryoutPlayers } from "./tryoutPlayerSearch.js";

describe("tryout desk player search", () => {
  it("searches both names within the selected club and deduplicates matches", async () => {
    const calls = [];
    const entity = { filter: async (query) => {
      calls.push(query);
      return query.first_name ? [{ id: "alex", first_name: "Alex" }] : [{ id: "alex", first_name: "Alex" }, { id: "jordan", last_name: "Alex" }];
    } };
    const players = await searchTryoutPlayers(entity, "demo-fc", " Alex ");
    expect(calls).toEqual([
      { club_id: "demo-fc", first_name: { $regex: "Alex" } },
      { club_id: "demo-fc", last_name: { $regex: "Alex" } },
    ]);
    expect(players.map((p) => p.id)).toEqual(["alex", "jordan"]);
  });
  it("does not query without a selected club or a usable search", async () => {
    let count = 0;
    const entity = { filter: async () => { count++; return []; } };
    await searchTryoutPlayers(entity, null, "Alex");
    await searchTryoutPlayers(entity, "demo-fc", " A ");
    expect(count).toBe(0);
  });
  it("propagates search failures instead of claiming no matches", async () => {
    const entity = { filter: async () => { throw new Error("Search denied"); } };
    await expect(searchTryoutPlayers(entity, "demo-fc", "Alex")).rejects.toThrow("Search denied");
  });
});