// Beacon urgency rules, shared by the browser and the server delivery action.
import { isInQuietHours, getMuteLevel } from "@/lib/quietHours";

export const URGENCY = { INFO: "info", IMPORTANT: "important", URGENT: "urgent" };

export const URGENCY_META = {
  info: { label: "Info", hint: "Shows in the channel only" },
  important: { label: "Important", hint: "Phone notification (respects mute & quiet hours)" },
  urgent: { label: "Urgent", hint: "Breaks through mute & quiet hours, plus text and email" },
};

/** Normalise older posts that only carried is_priority. */
export function urgencyOf(message) {
  if (message?.urgency && URGENCY_META[message.urgency]) return message.urgency;
  return message?.is_priority ? URGENCY.URGENT : URGENCY.INFO;
}

/**
 * Decide how one person hears about a post.
 * Returns { notify: 'push'|'badge'|null, email: bool, sms: bool }.
 */
export function planDelivery({ urgency, prefs, channelId, teamId, phone, now = new Date() }) {
  const muteLevel = getMuteLevel(prefs, channelId, teamId);
  const quiet = isInQuietHours(prefs?.quiet_hours, now);
  if (urgency === URGENCY.URGENT) {
    return {
      notify: "push",
      email: prefs?.email_urgent !== false,
      sms: prefs?.sms_urgent !== false && !!(prefs?.sms_phone || phone),
    };
  }
  if (urgency === URGENCY.IMPORTANT) {
    if (muteLevel || quiet) return { notify: "badge", email: false, sms: false };
    return { notify: "push", email: false, sms: false };
  }
  // Info: follows each person's per-channel setting; muted or quiet means badge only.
  if (muteLevel || quiet) return { notify: "badge", email: false, sms: false };
  const preset = { essentials: "badge", balanced: "push", everything: "push" }[prefs?.preset || "balanced"];
  const pref = prefs?.channel_overrides?.[channelId] || preset;
  return { notify: pref === "off" ? null : pref === "push" ? "push" : "badge", email: false, sms: false };
}

/** People in the audience who have not tapped "Got it" (or read, when no ack was asked). */
export function pendingRecipients(message, audienceEmails) {
  const seen = new Set([...(message?.acknowledged_by || []), ...(message?.ack_required ? [] : message?.read_by || [])].map((e) => String(e).toLowerCase()));
  return audienceEmails.filter((e) => e && !seen.has(e.toLowerCase()) && e.toLowerCase() !== String(message?.author_email || "").toLowerCase());
}

export function mapsLink(location) {
  if (!location) return null;
  const q = [location.name, location.address].filter(Boolean).join(", ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

/** Quick sideline updates coaches can send in one tap. */
export const SIDELINE_UPDATES = [
  { key: "late", label: "Running late", urgency: "important", text: "Heads up: we're running about 15 minutes late." },
  { key: "weather", label: "Weather delay", urgency: "urgent", text: "Weather delay: everyone off the field and into cars. We'll update in 30 minutes." },
  { key: "field", label: "Field changed", urgency: "urgent", text: "Field change: we've moved fields. Check the pin below." },
  { key: "cancel", label: "Cancelled", urgency: "urgent", text: "Today's session is cancelled. Please don't travel to the field." },
  { key: "pickup", label: "Pickup ready", urgency: "important", text: "We're done. Players are ready for pickup at the main lot." },
];
