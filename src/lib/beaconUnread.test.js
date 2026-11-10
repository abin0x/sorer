import { expect, test } from "bun:test";
import { unreadByChannel } from "./beaconUnread.js";

test("counts only other people's unread posts per channel", () => {
  const msgs = [
    { channel_id: "a", author_email: "coach@x.com" },
    { channel_id: "a", author_email: "coach@x.com", read_by: ["me@x.com"] },
    { channel_id: "a", author_email: "me@x.com" },
    { channel_id: "b", author_email: "coach@x.com" },
  ];
  expect(unreadByChannel(msgs, "me@x.com")).toEqual({ a: 1, b: 1 });
});
