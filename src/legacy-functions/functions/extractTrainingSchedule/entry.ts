// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import * as XLSX from 'xlsx';

const FACILITY_PATTERNS = [
  { prefix: "ITC", facility: "ITC (Indoor Training Center)" },
  { prefix: "Lyon Oaks", facility: "Lyon Oaks" },
  { prefix: "Wixom", facility: "Wixom Dome" },
  { prefix: "Novi", facility: "Novi Athletic Facility" },
];

const DAY_MAP = {
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, weds: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
  sunday: 0, sun: 0,
};

function inferFacilityName(fieldName) {
  const name = fieldName.trim();
  for (const p of FACILITY_PATTERNS) {
    if (name.toLowerCase().startsWith(p.prefix.toLowerCase())) return p.facility;
  }
  return name;
}

function isTimeRange(str) {
  return /^\d{1,2}(:\d{2})?\s*(am|pm)?\s*-\s*\d{1,2}(:\d{2})?\s*(am|pm)?/i.test(str);
}

function parseTime(str) {
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
  if (m) {
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h < 12) h += 12;
    return { h, m: min };
  }
  m = s.match(/^(\d{1,2})$/);
  if (m) {
    let h = parseInt(m[1], 10);
    if (h < 12) h += 12;
    return { h, m: 0 };
  }
  return null;
}

function parseTimeRange(range) {
  if (!range) return null;
  const parts = range.split("-");
  if (parts.length !== 2) return null;
  const start = parseTime(parts[0].trim());
  const end = parseTime(parts[1].trim());
  if (!start || !end) return null;
  return { start, end };
}

function findTeam(teamByName, teamName) {
  const name = teamName.trim();
  let team = teamByName.get(name.toLowerCase());
  if (team) return team;
  const withoutParens = name.replace(/\s*\([^)]*\)\s*/g, "").trim();
  if (withoutParens && withoutParens !== name) {
    team = teamByName.get(withoutParens.toLowerCase());
    if (team) return team;
  }
  return null;
}

function parseSheet(sheetData, dayName) {
  const bookings = [];
  if (!sheetData || sheetData.length === 0) return bookings;

  let headerRowIdx = 0;
  for (let rowIdx = 0; rowIdx < sheetData.length; rowIdx++) {
    const row = sheetData[rowIdx] || [];
    let nonEmptyCount = 0;
    for (const cell of row) {
      if (cell == null || cell === "") continue;
      if (typeof cell === "number") continue;
      if (cell instanceof Date || typeof cell === "number") continue;
      const cellStr = String(cell).trim();
      if (cellStr && !isTimeRange(cellStr)) nonEmptyCount++;
    }
    if (nonEmptyCount >= 2) { headerRowIdx = rowIdx; break; }
  }

  const headers = (sheetData[headerRowIdx] || []).map((h) => (h != null ? String(h).trim() : ""));
  const numCols = headers.length;
  const currentTimes = new Array(numCols).fill(null);

  for (let rowIdx = headerRowIdx + 1; rowIdx < sheetData.length; rowIdx++) {
    const row = sheetData[rowIdx] || [];

    let rowTime = null;
    for (let colIdx = 0; colIdx < numCols; colIdx++) {
      const cell = row[colIdx];
      if (cell == null || cell === "") continue;
      if (cell instanceof Date || typeof cell === "number") continue;
      const cellStr = String(cell).trim();
      if (isTimeRange(cellStr)) {
        rowTime = cellStr;
        break;
      }
    }

    if (rowTime) {
      for (let colIdx = 0; colIdx < numCols; colIdx++) {
        const cell = row[colIdx];
        if (cell == null || cell === "" || cell instanceof Date) {
          currentTimes[colIdx] = rowTime;
        } else {
          const cellStr = String(cell).trim();
          currentTimes[colIdx] = isTimeRange(cellStr) ? cellStr : rowTime;
        }
      }
      continue;
    }

    for (let colIdx = 0; colIdx < numCols; colIdx++) {
      const cell = row[colIdx];
      if (cell == null || cell === "") continue;
      if (cell instanceof Date || typeof cell === "number") continue;
      const cellStr = String(cell).trim();
      if (!cellStr || isTimeRange(cellStr)) continue;

      if (currentTimes[colIdx] && headers[colIdx]) {
        bookings.push({
          day: dayName,
          field: headers[colIdx],
          time_range: currentTimes[colIdx],
          team: cellStr,
          program_type: "training",
        });
      }
    }
  }

  return bookings;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { file_url, week_start_date } = body;
    if (!file_url) return Response.json({ error: "file_url is required" }, { status: 400 });

    const response = await fetch(file_url);
    if (!response.ok) return Response.json({ error: `Failed to fetch file: ${response.status}` }, { status: 500 });
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    const allBookings = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
      const bookings = parseSheet(sheetData, sheetName.trim());
      allBookings.push(...bookings);
    }

    const bookings = allBookings;

    if (bookings.length === 0) {
      return Response.json({ error: "No bookings found in the file. The file may be in an unexpected format." }, { status: 400 });
    }

    const [existingFacilities, existingFields, existingTeams] = await Promise.all([
      base44.asServiceRole.entities.Facility.list("name", 500),
      base44.asServiceRole.entities.Field.list("name", 500),
      base44.asServiceRole.entities.Team.list("name", 500),
    ]);

    const facilityByName = new Map(existingFacilities.map((f) => [f.name.toLowerCase(), f]));
    const fieldByName = new Map(existingFields.map((f) => [f.name.toLowerCase(), f]));
    const teamByName = new Map(existingTeams.map((t) => [t.name.toLowerCase(), t]));

    const facilitiesCreated = [];
    const fieldsCreated = [];

    for (const booking of bookings) {
      const fieldName = (booking.field || "").trim();
      if (!fieldName) continue;

      const facilityName = inferFacilityName(fieldName);
      const isIndoor = facilityName.toLowerCase().includes("dome") || facilityName.toLowerCase().includes("indoor");

      if (!facilityByName.has(facilityName.toLowerCase())) {
        const newFac = await base44.asServiceRole.entities.Facility.create({
          name: facilityName,
          surface_type: isIndoor ? "indoor" : "grass",
          field_count: 1,
          is_active: true,
        });
        facilityByName.set(facilityName.toLowerCase(), newFac);
        facilitiesCreated.push(facilityName);
      }

      if (!fieldByName.has(fieldName.toLowerCase())) {
        const fac = facilityByName.get(facilityName.toLowerCase());
        const newField = await base44.asServiceRole.entities.Field.create({
          name: fieldName,
          facility_id: fac.id,
          facility_name: fac.name,
          surface: isIndoor ? "indoor_hard" : "grass",
          indoor_outdoor: isIndoor ? "indoor" : "outdoor",
          status: "active",
        });
        fieldByName.set(fieldName.toLowerCase(), newField);
        fieldsCreated.push(fieldName);
      }
    }

    const weekStart = week_start_date ? new Date(week_start_date) : new Date();
    const monday = new Date(weekStart);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - monday.getDay() + 1);

    const eventsCreated = [];
    const errors = [];
    const seenKeys = new Set();

    for (const booking of bookings) {
      const fieldName = (booking.field || "").trim();
      const dayName = (booking.day || "").trim().toLowerCase();
      const timeRange = (booking.time_range || "").trim();
      const teamName = (booking.team || "").trim();

      if (!fieldName || !dayName || !timeRange || !teamName) continue;

      const field = fieldByName.get(fieldName.toLowerCase());
      if (!field) { errors.push(`Field not found: ${fieldName}`); continue; }

      const dayIndex = DAY_MAP[dayName];
      if (dayIndex === undefined) { errors.push(`Invalid day: ${booking.day}`); continue; }

      const parsedTime = parseTimeRange(timeRange);
      if (!parsedTime) { errors.push(`Invalid time range: ${timeRange}`); continue; }

      const team = findTeam(teamByName, teamName);
      const dedupeKey = `${fieldName}|${dayName}|${timeRange}|${teamName}`;
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      const eventDate = new Date(monday);
      eventDate.setDate(monday.getDate() + (dayIndex === 0 ? 6 : dayIndex - 1));

      const startDt = new Date(eventDate);
      startDt.setHours(parsedTime.start.h, parsedTime.start.m, 0, 0);
      const endDt = new Date(eventDate);
      endDt.setHours(parsedTime.end.h, parsedTime.end.m, 0, 0);

      const title = `${teamName} Training`;

      await base44.asServiceRole.entities.CalendarEvent.create({
        title,
        event_type: "practice",
        start_datetime: startDt.toISOString(),
        end_datetime: endDt.toISOString(),
        location_text: fieldName,
        facility_id: field.facility_id || "",
        field_id: field.id,
        field_name: fieldName,
        team_ids: team ? [team.id] : [],
        team_names: team ? [team.name] : [teamName],
        is_recurring: false,
        status: "confirmed",
        visibility: "team_only",
        notes: "",
      });
      eventsCreated.push(title);
    }

    return Response.json({
      success: true,
      summary: {
        total_bookings_extracted: bookings.length,
        facilities_created: facilitiesCreated.length,
        facilities_names: facilitiesCreated,
        fields_created: fieldsCreated.length,
        fields_names: fieldsCreated,
        events_created: eventsCreated.length,
        errors,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}