import { describe, it, expect } from "vitest";
import { isPublicLegacyAction } from "./legacyPublicActions";

describe("signed-out tryout actions", () => {
  it("allows family dues lookup and validated checkout but never plan mutations", () => {
    expect(isPublicLegacyAction("get-dues-offer", {})).toBe(true);
    expect(isPublicLegacyAction("create-offer-checkout", { items: [{ type: "dues" }] })).toBe(true);
    expect(isPublicLegacyAction("send-dues-link", {})).toBe(false);
    expect(isPublicLegacyAction("create-offer-checkout", { items: [{ type: "spiritwear" }] })).toBe(false);
  });
  it("lets families open and submit a final-registration invite", () => {
    expect(isPublicLegacyAction("getFinalRegistrationInvite", { inviteId: "x" })).toBe(true);
    expect(isPublicLegacyAction("submitFinalRegistration", { inviteId: "x" })).toBe(true);
  });
  it("lets a new invitee open their club invitation link but not accept or manage invites signed out", () => {
    expect(isPublicLegacyAction("getInvitationDetails", { token: "x" })).toBe(true);
    expect(isPublicLegacyAction("applyPendingInvitation", { token: "x" })).toBe(false);
    expect(isPublicLegacyAction("manageStaffInvitations", { action: "link" })).toBe(false);
  });
  it("only opens the family reply parts of tryout offers", () => {
    expect(isPublicLegacyAction("tryout-offers", { action: "respond" })).toBe(true);
    expect(isPublicLegacyAction("tryout-offers", { action: "family" })).toBe(true);
    expect(isPublicLegacyAction("tryout-offers", { action: "send" })).toBe(false);
    expect(isPublicLegacyAction("tryout-offers", {})).toBe(false);
  });
  it("allows signed-out payment only for tryout invites", () => {
    expect(isPublicLegacyAction("create-club-checkout", { source_type: "tryout_final_registration" })).toBe(true);
    expect(isPublicLegacyAction("create-club-checkout", { source_type: "registration" })).toBe(false);
    expect(isPublicLegacyAction("process-refund", { source_type: "tryout_final_registration" })).toBe(false);
  });
});
