import { describe, it, expect } from "bun:test";
import { getSaasAdminNavGroups } from "./saasAdminNav.js";
import { canShowNavigationGroup, consoleNavigationUrl, isNavigationItemActive, tryoutDashboardNavItem } from "./layoutNavigation.js";

describe("console and club navigation", () => {
  it("includes every System Owner console destination", () => {
    expect(getSaasAdminNavGroups(true).flatMap((group) => group.items.map((item) => item.saasTab))).toEqual([
      "overview", "tenants", "signups", "migrations", "users", "modules", "billing", "tickets", "support", "outreach", "demo", "config", "tests",
    ]);
  });
  it("keeps All Pages exclusive to the system owner", () => {
    const group = { ownerOnly: true };
    expect(canShowNavigationGroup(group, { system_role: "system_owner" }, true)).toBe(true);
    expect(canShowNavigationGroup(group, { system_role: "system_admin" }, true)).toBe(false);
    expect(canShowNavigationGroup(group, { custom_role: "club_admin" }, false)).toBe(false);
    expect(canShowNavigationGroup(group, { is_super_admin: true }, true)).toBe(false);
  });
  it("makes the Tryout Dashboard available to club admins", () => {
    expect(tryoutDashboardNavItem.showFor.includes("club_admin")).toBe(true);
    expect(tryoutDashboardNavItem.url).toBe("/tryoutdashboard");
    expect(tryoutDashboardNavItem.showFor.includes("parent_guardian")).toBe(false);
  });
  it("preserves club selection while changing console tabs", () => {
    expect(consoleNavigationUrl("users", "?tab=tenants&club=demo-fc")).toBe("/saasadmin?tab=users&club=demo-fc");
  });
  it("activates only the selected console tab, including uppercase legacy URLs", () => {
    const [overview, tenants] = getSaasAdminNavGroups(true)[0].items;
    expect(isNavigationItemActive(overview, "/SaaSAdmin", "?tab=tenants")).toBe(false);
    expect(isNavigationItemActive(tenants, "/saasadmin", "?tab=tenants")).toBe(true);
    expect(isNavigationItemActive(overview, "/saasadmin")).toBe(true);
  });
});
import { resolveNavSection, findActiveNavSection } from "./layoutNavigation.js";

describe("nested nav sections", () => {
  const facilities = { title: "Facilities", url: "/facilitymanagerdashboard", showFor: ["a"], children: [
    { title: "Schedule Import", url: "/facilities?tab=schedule", showFor: ["a", "b"] },
  ] };
  const visibleFor = (role) => (i) => i.showFor.includes(role);

  it("promotes the first visible child when the parent is hidden", () => {
    const s = resolveNavSection(facilities, visibleFor("b"));
    expect(s.url).toBe("/facilities?tab=schedule");
    expect(s.entries).toHaveLength(1);
  });

  it("finds the parent section for a nested page", () => {
    const s = findActiveNavSection([{ items: [facilities] }], visibleFor("a"), "/facilities", "?tab=schedule");
    expect(s?.title).toBe("Facilities");
    expect(s.entries.map((e) => e.title)).toEqual(["Facilities", "Schedule Import"]);
  });
});
