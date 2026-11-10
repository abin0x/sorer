/** Returns { weekday, hour, minute, minutesOfDay } for "now" in the given IANA timezone. */
export function getCurrentTimeInZone(timeZone) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(now).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  const hour = parseInt(parts.hour, 10) % 24;
  const minute = parseInt(parts.minute, 10);
  return { weekday: parts.weekday, hour, minute, minutesOfDay: hour * 60 + minute };
}

function toMinutes(hhmm) {
  const [h, m] = (hhmm || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** True if "now" falls inside the user's configured quiet hours window. */
export function isInQuietHours(quietHours) {
  if (!quietHours?.enabled) return false;
  const tz = quietHours.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { weekday, minutesOfDay } = getCurrentTimeInZone(tz);
  const isWeekend = weekday === "Sat" || weekday === "Sun";
  const start = toMinutes(isWeekend ? (quietHours.weekend_start || quietHours.weekday_start) : quietHours.weekday_start);
  const end = toMinutes(isWeekend ? (quietHours.weekend_end || quietHours.weekday_end) : quietHours.weekday_end);
  if (start === end) return false;
  if (start < end) return minutesOfDay >= start && minutesOfDay < end;
  // Overnight window, e.g. 21:00 -> 07:00
  return minutesOfDay >= start || minutesOfDay < end;
}

/**
 * Decision order for a single notification:
 * 1. priority -> push (unless in quiet hours and the user opted out of the priority override)
 * 2. muted (channel or team) -> badge only (mentions-only mute still badges non-mentions)
 * 3. quiet hours -> digest (held for the summary)
 * 4. the user's preference for this channel (push/badge/digest/off)
 */
export function resolveDelivery({ isPriority, isMention, muteLevel, prefs, channelOverride }) {
  const quiet = isInQuietHours(prefs?.quiet_hours);

  if (isPriority) {
    if (quiet && prefs?.quiet_hours?.priority_override === false) return "digest";
    return "push";
  }
  if (muteLevel === "muted") return "badge";
  if (muteLevel === "mentions" && !isMention) return "badge";
  if (quiet) return "digest";
  if (isMention && prefs?.mention_push !== false) return "push";

  const presetDefault = { essentials: "badge", balanced: "push", everything: "push" }[prefs?.preset || "balanced"];
  const pref = channelOverride || presetDefault;
  return pref;
}

/** Find the active (non-expired) mute level for a channel/team from the user's preference row. */
export function getMuteLevel(prefs, channelId, teamId) {
  const mutes = prefs?.mutes || [];
  const now = Date.now();
  const active = mutes.filter((m) => !m.expires_at || new Date(m.expires_at).getTime() > now);
  const channelMute = active.find((m) => m.scope === "channel" && m.target_id === channelId);
  if (channelMute) return channelMute.level;
  const teamMute = teamId ? active.find((m) => m.scope === "team" && m.target_id === teamId) : null;
  if (teamMute) return teamMute.level;
  return null;
}

export const MUTE_DURATIONS = [
  { value: "1h", label: "1 hour", ms: 60 * 60 * 1000 },
  { value: "8h", label: "8 hours", ms: 8 * 60 * 60 * 1000 },
  { value: "tomorrow", label: "Until tomorrow", ms: null },
  { value: "1w", label: "1 week", ms: 7 * 24 * 60 * 60 * 1000 },
  { value: "forever", label: "Until I change it", ms: null },
];

export function computeMuteExpiry(durationValue) {
  if (durationValue === "forever") return null;
  if (durationValue === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(7, 0, 0, 0);
    return d.toISOString();
  }
  const match = MUTE_DURATIONS.find((d) => d.value === durationValue);
  if (!match?.ms) return null;
  return new Date(Date.now() + match.ms).toISOString();
}