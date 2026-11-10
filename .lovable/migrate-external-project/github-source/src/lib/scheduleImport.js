// Helpers for turning an uploaded weekly-schedule spreadsheet into recurring CalendarEvent records.

export const SCHEDULE_CSV_FIELDS = [
  { key: "field", label: "Field" },
  { key: "day", label: "Day" },
  { key: "start_time", label: "Start Time" },
  { key: "end_time", label: "End Time" },
  { key: "team", label: "Team" },
  { key: "event_type", label: "Event Type" },
  { key: "notes", label: "Notes" },
];

const DAY_MAP = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const EVENT_TYPES = ["practice", "game", "tournament", "meeting", "camp", "clinic", "other"];

export function parseTimeString(str) {
  if (!str) return null;
  const s = String(str).trim();
  let m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ap = m[3].toLowerCase();
    if (ap === "pm" && h !== 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return { h, m: min };
  }
  m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) return { h: parseInt(m[1], 10), m: parseInt(m[2], 10) };
  return null;
}

/**
 * Build recurring CalendarEvent payloads from parsed CSV rows.
 * @param {Array} rows - parsed rows keyed by SCHEDULE_CSV_FIELDS keys
 * @param {Array} fields - Field entity records
 * @param {Array} teams - Team entity records
 * @param {string} seasonStart - ISO date string (yyyy-mm-dd) for the first week
 * @param {number} weeks - number of weeks to generate
 * @param {string} defaultEventType
 * @returns {{ events: Array, errors: Array<string> }}
 */
export function buildRecurringEvents({ rows, fields, teams, seasonStart, weeks, defaultEventType = "practice" }) {
  const events = [];
  const errors = [];
  const fieldByName = new Map(fields.map((f) => [f.name.toLowerCase().trim(), f]));
  const teamByName = new Map(teams.map((t) => [t.name.toLowerCase().trim(), t]));
  const recurrenceGroupId = `wk-${Date.now()}`;

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const fieldName = (row.field || "").trim();
    const dayName = (row.day || "").trim().toLowerCase();
    const dayIndex = DAY_MAP[dayName];
    const startTime = parseTimeString(row.start_time);
    const endTime = parseTimeString(row.end_time);
    const teamName = (row.team || "").trim();
    const eventTypeRaw = (row.event_type || defaultEventType || "practice").trim().toLowerCase();
    const eventType = EVENT_TYPES.includes(eventTypeRaw) ? eventTypeRaw : "practice";

    if (!fieldName) { errors.push(`Row ${rowNum}: missing field name`); return; }
    const field = fieldByName.get(fieldName.toLowerCase());
    if (!field) { errors.push(`Row ${rowNum}: field "${fieldName}" not found`); return; }
    if (dayIndex === undefined) { errors.push(`Row ${rowNum}: invalid day "${row.day}"`); return; }
    if (!startTime || !endTime) { errors.push(`Row ${rowNum}: invalid start/end time`); return; }

    let team = null;
    if (teamName) {
      team = teamByName.get(teamName.toLowerCase());
      if (!team) errors.push(`Row ${rowNum}: team "${teamName}" not found — event created without a team link`);
    }

    // Find the first occurrence of dayIndex on/after seasonStart
    const start = new Date(`${seasonStart}T00:00:00`);
    while (start.getDay() !== dayIndex) start.setDate(start.getDate() + 1);

    for (let w = 0; w < weeks; w++) {
      const eventDate = new Date(start);
      eventDate.setDate(start.getDate() + w * 7);
      const startDt = new Date(eventDate);
      startDt.setHours(startTime.h, startTime.m, 0, 0);
      const endDt = new Date(eventDate);
      endDt.setHours(endTime.h, endTime.m, 0, 0);

      events.push({
        title: `${team ? team.name : fieldName} ${eventType === "game" ? "Game" : "Training"}`,
        event_type: eventType,
        start_datetime: startDt.toISOString(),
        end_datetime: endDt.toISOString(),
        location_text: field.name,
        facility_id: field.facility_id || "",
        field_id: field.id,
        field_name: field.name,
        team_ids: team ? [team.id] : [],
        team_names: team ? [team.name] : [],
        is_recurring: true,
        recurrence_group_id: recurrenceGroupId,
        status: "confirmed",
        visibility: "team_only",
        notes: row.notes || "",
      });
    }
  });

  return { events, errors };
}