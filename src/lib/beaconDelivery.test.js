import { describe, it, expect } from "vitest";
import { planDelivery, pendingRecipients, urgencyOf } from "./beaconDelivery";

const muted = { mutes: [{ scope: "channel", target_id: "c1", level: "muted" }] };
const quietAllDay = { quiet_hours: { enabled: true, timezone: "UTC", weekday_start: "00:00", weekday_end: "23:59", weekend_start: "00:00", weekend_end: "23:59" } };

describe("Beacon urgency", () => {
  it("urgent breaks through mute with push, email and text", () => {
    expect(planDelivery({ urgency: "urgent", prefs: muted, channelId: "c1", phone: "+15550001" })).toEqual({ notify: "push", email: true, sms: true });
  });
  it("urgent breaks through quiet hours", () => {
    expect(planDelivery({ urgency: "urgent", prefs: quietAllDay, channelId: "c1" }).notify).toBe("push");
  });
  it("urgent sends no text without a phone number", () => {
    expect(planDelivery({ urgency: "urgent", prefs: null, channelId: "c1" }).sms).toBe(false);
  });
  it("urgent respects a person turning texts off", () => {
    expect(planDelivery({ urgency: "urgent", prefs: { sms_urgent: false }, channelId: "c1", phone: "+1" }).sms).toBe(false);
  });
  it("important respects mute", () => {
    expect(planDelivery({ urgency: "important", prefs: muted, channelId: "c1" }).notify).toBe("badge");
  });
  it("important pushes when not muted", () => {
    expect(planDelivery({ urgency: "important", prefs: null, channelId: "c1" })).toEqual({ notify: "push", email: false, sms: false });
  });
  it("info never texts or emails", () => {
    const p = planDelivery({ urgency: "info", prefs: null, channelId: "c1", phone: "+1" });
    expect(p.sms || p.email).toBe(false);
  });
  it("old priority posts count as urgent", () => {
    expect(urgencyOf({ is_priority: true })).toBe("urgent");
  });
  it("follow-up skips people who tapped Got it and the author", () => {
    const m = { ack_required: true, acknowledged_by: ["a@x.com"], author_email: "coach@x.com" };
    expect(pendingRecipients(m, ["a@x.com", "b@x.com", "coach@x.com"])).toEqual(["b@x.com"]);
  });
});
