// Shared game-day rules: arrival time, clock, periods, score changes and recap text.
export const PERIODS = [
  { key: "pregame", label: "Pre-game" },
  { key: "first_half", label: "1st Half" },
  { key: "halftime", label: "Halftime" },
  { key: "second_half", label: "2nd Half" },
  { key: "final", label: "Final" },
];
export const periodLabel = (key) => PERIODS.find((p) => p.key === key)?.label || "Pre-game";
export const KITS = ["Home (primary)", "Away (alternate)", "Third kit", "Training bibs"];

/** Arrival time = kickoff minus the buffer (minutes). Returns a Date or null. */
export function arrivalTime(kickoffIso, minutesBefore = 45) {
  if (!kickoffIso) return null;
  const d = new Date(kickoffIso);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() - Math.max(0, Number(minutesBefore) || 0) * 60000);
}

/** Seconds on the unofficial clock right now. */
export function clockSeconds(event, now = Date.now()) {
  const base = Number(event?.clock_elapsed_seconds) || 0;
  if (!event?.clock_started_at) return base;
  return base + Math.max(0, Math.floor((now - new Date(event.clock_started_at).getTime()) / 1000));
}
export const formatClock = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export const clockStart = (event, now = new Date()) => (event?.clock_started_at ? {} : { clock_started_at: now.toISOString() });
export const clockPause = (event, now = Date.now()) => ({ clock_started_at: null, clock_elapsed_seconds: clockSeconds(event, now) });
export const clockReset = () => ({ clock_started_at: null, clock_elapsed_seconds: 0 });

/** Score change for one side; never below zero, locked once Final. */
export function scoreChange(event, side, delta) {
  if (event?.period === "final") return null;
  const field = side === "opponent" ? "opponent_score" : "team_score";
  const next = Math.max(0, (Number(event?.[field]) || 0) + delta);
  return next === (Number(event?.[field]) || 0) ? null : { [field]: next };
}

export function teamName(event) {
  return event?.home_team_name || (Array.isArray(event?.team_names) ? event.team_names[0] : null) || event?.title || "Our team";
}
export function opponentName(event) {
  return event?.opponent_name || event?.away_team_name || "Opponent";
}

/** Recap text for the team channel. */
export function recapText(event) {
  const us = Number(event?.team_score) || 0, them = Number(event?.opponent_score) || 0;
  const result = us > them ? "Win" : us < them ? "Loss" : "Draw";
  return `🏁 Final: ${teamName(event)} ${us} – ${them} ${opponentName(event)} (${result}${event?.is_away ? ", away" : ""}). Thanks for the support!`;
}

// ---- Volunteers ----
export const DEFAULT_VOLUNTEER_ROLES = ["Halftime snacks", "Team tent / canopy", "Camera / Veo", "Assistant line judge"];
export const defaultSlots = () => DEFAULT_VOLUNTEER_ROLES.map((role, i) => ({ id: `s${i + 1}`, role, email: null, name: null }));
export function claimSlot(slots, slotId, person) {
  return (slots || []).map((s) => (s.id === slotId && !s.email ? { ...s, email: person.email, name: person.name || person.email } : s));
}
export function releaseSlot(slots, slotId, email) {
  return (slots || []).map((s) => (s.id === slotId && s.email === email ? { ...s, email: null, name: null } : s));
}
export const openSlots = (slots) => (slots || []).filter((s) => !s.email);
export function volunteerReminder(event, slots) {
  const open = openSlots(slots);
  if (!open.length) return null;
  return `🙋 Volunteers needed for ${teamName(event)} vs ${opponentName(event)}: ${open.map((s) => s.role).join(", ")}. Tap the game to sign up!`;
}

// ---- Weather ----
export const zipFrom = (text) => (String(text || "").match(/\b(\d{5})(?:-\d{4})?\b/) || [])[1] || null;
const WMO = { 0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Cloudy", 45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Drizzle", 55: "Drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Showers", 81: "Showers", 82: "Heavy showers", 95: "Thunderstorms", 96: "Thunderstorms", 99: "Thunderstorms" };
export const weatherLabel = (code) => WMO[code] || "Mixed";
/** Index of the hourly slot closest to kickoff. */
export function nearestHour(times, kickoffIso) {
  const k = new Date(kickoffIso).getTime();
  let best = -1, diff = Infinity;
  (times || []).forEach((t, i) => { const d = Math.abs(new Date(t).getTime() - k); if (d < diff) { diff = d; best = i; } });
  return diff <= 90 * 60000 ? best : -1;
}

// ---- Persona switcher ----
const ADMIN_ROLES = ["master_admin", "admin", "branch_admin", "club_admin", "club_director", "branch_director", "platform_director"];
export function personasFor(user, { isCoach = false, isGuardian = false } = {}) {
  const role = user?.custom_role || user?.role;
  const list = [];
  if (ADMIN_ROLES.includes(role)) list.push("admin");
  if (role === "coach" || isCoach) list.push("coach");
  if (["parent_guardian", "team_manager", "player"].includes(role) || isGuardian) list.push("member");
  return list;
}
