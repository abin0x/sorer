// Persistence for bookings, grid assignments, conflicts and import batches.
import { base44 } from "@/api/base44Client";
import {
  layoutFor, formatFromName, defaultSplit, detectConflicts, kindOf, bookingType, sortLabels,
} from "@/lib/gridEngine";
import { teamMeta, MAPPING_VERSION } from "@/lib/gridImport";

const E = base44.entities;
const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function pageAll(entity, query) {
  const out = [];
  let cursor;
  do {
    const page = await entity.filter(query, cursor ? { limit: 1000, cursor } : { limit: 1000 });
    out.push(...page.items);
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return out;
}

const facilityOf = (name) => (name.match(/^(ITC|Lyon Oaks|Wixom)/i) || [])[1] || "Other";
const fromRecord = (r) => ({ ...r, start: r.start_min, end: r.end_min, team: r.team_name || "", coach: r.coach_name || "", platform: r.platform_name || "" });

export async function loadWeekBookings(clubId, weekStart) {
  return (await pageAll(E.Booking, { club_id: clubId, week_start: weekStart })).map(fromRecord);
}

export async function loadWeek(clubId, weekStart) {
  const [rows, grids, fields] = await Promise.all([
    pageAll(E.Booking, { club_id: clubId, week_start: weekStart }),
    pageAll(E.BookingGrid, { club_id: clubId, week_start: weekStart }),
    pageAll(E.Field, { club_id: clubId }),
  ]);
  const formats = {};
  fields.forEach((f) => { formats[f.id] = f.format || formatFromName(f.name); });
  const bookings = rows.map(fromRecord);
  const assignments = {};
  grids.forEach((g) => { (assignments[g.booking_id] ||= []).push(g.grid_label); });
  bookings.forEach((b) => {
    if (assignments[b.id]) assignments[b.id] = sortLabels(assignments[b.id], formats[b.field_id] || formatFromName(b.field_name));
  });
  return { bookings, assignments, formats };
}

export async function loadTeamPlatforms(clubId) {
  const teams = await pageAll(E.ScheduleTeam, { club_id: clubId });
  return Object.fromEntries(teams.filter((t) => t.platform_name).map((t) => [t.name, t.platform_name]));
}

async function gridIdMap(fieldIds) {
  if (!fieldIds.length) return {};
  const grids = await pageAll(E.Grid, { field_id: { $in: fieldIds } });
  return Object.fromEntries(grids.map((g) => [`${g.field_id}|${g.label}`, g.id]));
}

/** Find or create Facility, Field (with format + layout) and Grid rows for each grid column header. */
async function ensureFields(clubId, names) {
  const [fields, facilities] = await Promise.all([pageAll(E.Field, { club_id: clubId }), pageAll(E.Facility, { club_id: clubId })]);
  const byName = new Map(fields.map((f) => [f.name.toLowerCase(), f]));
  const facByName = new Map(facilities.map((f) => [f.name.toLowerCase(), f]));
  const result = {};
  for (const name of names) {
    let f = byName.get(name.toLowerCase());
    const format = f?.format || formatFromName(name);
    const labels = layoutFor(format).labels;
    if (!f) {
      const fname = facilityOf(name);
      let fac = facByName.get(fname.toLowerCase());
      if (!fac) {
        fac = await E.Facility.create({ club_id: clubId, name: fname });
        facByName.set(fname.toLowerCase(), fac);
      }
      f = await E.Field.create({
        club_id: clubId, name, facility_id: fac.id, facility_name: fac.name, format, format_supported: [format],
        grid_layout: labels.join(","), max_sections: labels.length, status: "active",
      });
      await E.Grid.bulkCreate(labels.map((label, i) => ({ club_id: clubId, field_id: f.id, label, position: i })));
    } else if (!f.format) {
      f = await E.Field.update(f.id, { format, grid_layout: labels.join(","), max_sections: labels.length });
      const have = await E.Grid.filter({ field_id: f.id }, { limit: 1 });
      if (!have.items.length) await E.Grid.bulkCreate(labels.map((label, i) => ({ club_id: clubId, field_id: f.id, label, position: i })));
    }
    result[name] = { id: f.id, facility_name: f.facility_name || facilityOf(name), format };
  }
  return result;
}

export async function saveAssignments({ clubId, weekStart, changed, next, bookings }) {
  if (!changed.length) return;
  const byId = Object.fromEntries(bookings.map((b) => [b.id, b]));
  const ids = await gridIdMap([...new Set(changed.map((id) => byId[id]?.field_id).filter(Boolean))]);
  for (const part of chunks(changed, 100)) await E.BookingGrid.deleteMany({ club_id: clubId, booking_id: { $in: part } });
  const rows = changed.flatMap((id) =>
    (next[id] || []).map((label) => ({ club_id: clubId, week_start: weekStart, booking_id: id, grid_label: label, grid_id: ids[`${byId[id]?.field_id}|${label}`] || "" }))
  );
  for (const part of chunks(rows, 200)) await E.BookingGrid.bulkCreate(part);
}

export async function syncConflicts(clubId, weekStart, list) {
  const existing = await pageAll(E.Conflict, { club_id: clubId, week_start: weekStart });
  const oldKeys = existing.map((c) => c.conflict_key).sort().join("\n");
  if (oldKeys === list.map((c) => c.key).sort().join("\n")) return;
  const resolved = new Set(existing.filter((c) => c.resolved).map((c) => c.conflict_key));
  await E.Conflict.deleteMany({ club_id: clubId, week_start: weekStart });
  const rows = list.map((c) => ({
    club_id: clubId, week_start: weekStart, booking_id: c.booking_id, other_booking_id: c.other_booking_id,
    type: c.type, severity: c.severity, message: c.message, conflict_key: c.key, resolved: resolved.has(c.key),
  }));
  for (const part of chunks(rows, 200)) await E.Conflict.bulkCreate(part);
}

/**
 * Commit a reviewed batch. Idempotent: bookings are upserted by identity key, and existing
 * grid assignments are kept; only bookings with no grids get the default split.
 */
export async function commitBatch({ clubId, weekStart, fileName, bookings, warnings, overrideReason }) {
  const fields = await ensureFields(clubId, [...new Set(bookings.map((b) => b.field_name))]);
  const base = (b) => `${clubId}|${fields[b.field_name].id}|${b.date}|${b.start}|${b.end}|${b.team}`;
  const counts = {};
  bookings.forEach((b) => { counts[base(b)] = (counts[base(b)] || 0) + 1; });
  const batch = await E.ImportBatch.create({
    club_id: clubId, week_start: weekStart, file_name: fileName, status: "committed", warnings,
    mapping_version: MAPPING_VERSION, booking_count: bookings.length, override_reason: overrideReason || "", committed_at: new Date().toISOString(),
  });
  const records = bookings.map((b) => ({
    club_id: clubId, week_start: weekStart, field_id: fields[b.field_name].id, field_name: b.field_name,
    facility_name: fields[b.field_name].facility_name, date: b.date, day: b.day, start_min: b.start, end_min: b.end,
    start_time: b.start_time, end_time: b.end_time, type: bookingType(b.event_type), event_type: b.event_type,
    team_name: b.team, coach_name: b.coach, platform_name: b.platform || "", notes: b.notes, source_ref: b.source_ref,
    identity_key: counts[base(b)] > 1 ? `${base(b)}|${b.coach}|${b.event_type}` : base(b), import_batch_id: batch.id,
  }));
  for (const part of chunks(records, 400)) await E.Booking.upsert(part, { key: "identity_key" });

  const { bookings: saved, assignments: current, formats } = await loadWeek(clubId, weekStart);
  const inBatch = new Set(records.map((r) => r.identity_key));
  const live = saved.filter((b) => inBatch.has(b.identity_key));
  const formatOf = (b) => formats[b.field_id] || formatFromName(b.field_name);
  const next = defaultSplit(live, current, formatOf);
  const fresh = live.filter((b) => !current[b.id]?.length && (next[b.id] || []).length).map((b) => b.id);
  await saveAssignments({ clubId, weekStart, changed: fresh, next: { ...current, ...next }, bookings: saved });
  await syncConflicts(clubId, weekStart, detectConflicts(saved, { ...current, ...next }, formatOf));

  const teams = {};
  bookings.filter((b) => b.team && kindOf(b) === "training" && b.platform).forEach((b) => { teams[b.team] = b.platform; });
  const teamRows = Object.entries(teams).map(([name, platform_name]) => ({ club_id: clubId, team_key: `${clubId}|${name}`, name, platform_name, ...teamMeta(name) }));
  if (teamRows.length) await E.ScheduleTeam.upsert(teamRows, { key: "team_key" });

  return { total: records.length, stale: saved.length - live.length, batchId: batch.id };
}