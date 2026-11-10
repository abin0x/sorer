// @ts-nocheck
import { rrulestr } from 'rrule';

/**
 * Shared recurrence-expansion logic used by both the "RecurrenceRule
 * created/updated" workflow function (expand-recurrence) and the nightly
 * rolling-extension function (extend-occurrences), so the two never drift.
 */

export function parseJsonArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

function toDateKey(d) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().slice(0, 10);
}

/**
 * Expands a RecurrenceRule record into a sorted, deduped list of
 * "YYYY-MM-DD" occurrence date strings, capped at `capDate`.
 */
export function expandOccurrenceDates(rule, capDate) {
  const dtstart = new Date(rule.dtstart);
  const exdates = new Set(parseJsonArray(rule.exdates).map(toDateKey));
  const rdates = parseJsonArray(rule.rdates).map((d) => new Date(d));

  let ruleDates = [];
  if (rule.rrule_string && rule.rrule_string.trim()) {
    const effectiveUntil = rule.until ? new Date(rule.until) : capDate;
    const r = rrulestr(rule.rrule_string, { dtstart });
    ruleDates = r.between(dtstart, effectiveUntil, true);
  }

  const all = [...ruleDates, ...rdates];
  const seen = new Set();
  const result = [];
  for (const d of all) {
    const key = toDateKey(d);
    if (exdates.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  result.sort();
  return result;
}

/**
 * Generates missing EventOccurrence rows for `event`/`rule` up to `capDate`,
 * then generates Session + GroupSession rows for the newly created
 * occurrences from the Event's session_templates. Idempotent — safe to call
 * repeatedly (skips dates/occurrences that already exist).
 */
export async function generateOccurrencesAndSessions(svc, event, rule, capDate) {
  const dateKeys = expandOccurrenceDates(rule, capDate);

  const existing = await svc.entities.EventOccurrence.filter({ event_id: event.id }, "-occurrence_date", 2000);
  const existingDates = new Set(existing.map((o) => o.occurrence_date));

  const toCreate = dateKeys
    .filter((d) => !existingDates.has(d))
    .map((d) => ({
      club_id: event.club_id,
      event_id: event.id,
      occurrence_date: d,
      timezone: event.timezone || "America/New_York",
      status: "scheduled",
      is_override: false,
    }));

  let createdOccurrences = [];
  if (toCreate.length > 0) {
    createdOccurrences = await svc.entities.EventOccurrence.bulkCreate(toCreate);
  }

  let sessionsCreated = 0;
  const templates = Array.isArray(event.session_templates) ? event.session_templates : [];
  if (templates.length > 0 && createdOccurrences.length > 0) {
    const flat = [];
    for (const occ of createdOccurrences) {
      for (const t of templates) {
        flat.push({
          groupIds: t.group_ids || [],
          session: {
            club_id: event.club_id,
            occurrence_id: occ.id,
            name: t.name,
            start_time: t.start_time,
            end_time: t.end_time,
            location_id: t.location_id || "",
            field_id: t.field_id || "",
            capacity: t.capacity || 0,
            status: "scheduled",
            notes: "",
          },
        });
      }
    }
    if (flat.length > 0) {
      const createdSessions = await svc.entities.Session.bulkCreate(flat.map((f) => f.session));
      sessionsCreated = createdSessions.length;

      const groupSessions = [];
      createdSessions.forEach((s, i) => {
        for (const gid of flat[i].groupIds) {
          groupSessions.push({ club_id: event.club_id, group_id: gid, session_id: s.id, notes: "" });
        }
      });
      if (groupSessions.length > 0) {
        await svc.entities.GroupSession.bulkCreate(groupSessions);
      }
    }
  }

  return { occurrencesCreated: createdOccurrences.length, sessionsCreated, totalDates: dateKeys.length };
}