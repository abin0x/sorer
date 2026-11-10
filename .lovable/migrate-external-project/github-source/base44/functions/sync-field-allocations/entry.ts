import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function timeToMin(t) {
  if (!t) return null;
  const m = /(\d{1,2}):(\d\d)/.exec(t);
  if (!m) return null;
  return +m[1] * 60 + +m[2];
}

function minToDisplay(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function snapToMonday(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const dow = d.getUTCDay();
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return monday.toISOString().slice(0, 10);
}

function dateInWeek(dateStr, weekStart) {
  if (!weekStart) return true;
  const d = new Date(`${dateStr}T00:00:00Z`).getTime();
  const w = new Date(`${weekStart}T00:00:00Z`).getTime();
  return d >= w && d < w + 7 * 86400000;
}

async function pageAll(entity, query) {
  const out = [];
  let cursor;
  do {
    const page = await entity.filter(query, cursor ? { limit: 500, cursor } : { limit: 500 });
    out.push(...(page.items || []));
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return out;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const clubId = body.club_id || user.club_id;
    const weekStart = body.week_start;

    if (!clubId) return Response.json({ error: 'club_id required' }, { status: 400 });

    const E = base44.asServiceRole.entities;

    // Load all fields for the club
    const fields = await pageAll(E.Field, { club_id: clubId });
    const fieldByName = new Map(fields.map((f) => [f.name.toLowerCase(), f]));
    const fieldsByFacility = new Map();
    fields.forEach((f) => {
      const key = (f.facility_name || '').toLowerCase();
      if (!fieldsByFacility.has(key)) fieldsByFacility.set(key, []);
      fieldsByFacility.get(key).push(f);
    });

    function matchField(location, fieldId, fieldName) {
      if (fieldId) {
        const f = fields.find((x) => x.id === fieldId);
        if (f) return f;
      }
      if (fieldName) {
        const f = fieldByName.get(fieldName.toLowerCase());
        if (f) return f;
      }
      if (!location) return null;
      const loc = location.toLowerCase();
      for (const [name, f] of fieldByName) { if (loc === name) return f; }
      for (const [name, f] of fieldByName) { if (loc.includes(name) || name.includes(loc)) return f; }
      for (const [facName, fList] of fieldsByFacility) {
        if (facName && (loc.includes(facName) || facName.includes(loc))) return fList[0];
      }
      return null;
    }

    const bookings = [];

    // 1. ClubEvents → bookings
    const events = await pageAll(E.ClubEvent, { club_id: clubId });
    for (const ev of events) {
      if (['cancelled', 'completed'].includes(ev.status) || !ev.start_date) continue;
      const start = new Date(`${ev.start_date}T00:00:00Z`);
      const end = ev.end_date ? new Date(`${ev.end_date}T00:00:00Z`) : new Date(start);
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        if (!dateInWeek(dateStr, weekStart)) continue;
        const field = matchField(ev.location);
        if (!field) continue;
        const sMin = timeToMin(ev.start_time);
        const eMin = timeToMin(ev.end_time);
        if (sMin == null || eMin == null) continue;
        bookings.push({
          club_id: clubId, week_start: snapToMonday(dateStr),
          field_id: field.id, field_name: field.name, facility_name: field.facility_name || '',
          date: dateStr, day: DAY_NAMES[d.getUTCDay()],
          start_min: sMin, end_min: eMin, start_time: minToDisplay(sMin), end_time: minToDisplay(eMin),
          type: 'training', event_type: 'practice', team_name: ev.name || '',
          source_ref: `event:${ev.id}`, identity_key: `${clubId}|${field.id}|${dateStr}|${sMin}|${eMin}|event:${ev.id}`,
        });
      }
    }

    // 2. TryoutEvents → bookings
    const tryouts = await pageAll(E.TryoutEvent, { club_id: clubId });
    for (const t of tryouts) {
      if (!t.date || !dateInWeek(t.date, weekStart)) continue;
      const field = matchField(t.location);
      if (!field) continue;
      const sMin = timeToMin(t.start_time);
      const eMin = timeToMin(t.end_time);
      if (sMin == null || eMin == null) continue;
      const d = new Date(`${t.date}T00:00:00Z`);
      bookings.push({
        club_id: clubId, week_start: snapToMonday(t.date),
        field_id: field.id, field_name: field.name, facility_name: field.facility_name || '',
        date: t.date, day: DAY_NAMES[d.getUTCDay()],
        start_min: sMin, end_min: eMin, start_time: minToDisplay(sMin), end_time: minToDisplay(eMin),
        type: 'training', event_type: 'practice', team_name: 'Tryout',
        source_ref: `tryout:${t.id}`, identity_key: `${clubId}|${field.id}|${t.date}|${sMin}|${eMin}|tryout:${t.id}`,
      });
    }

    // 3. Tournament Games → bookings
    const games = await pageAll(E.Game, { club_id: clubId });
    for (const g of games) {
      if (!g.scheduled_date || !dateInWeek(g.scheduled_date, weekStart)) continue;
      const field = matchField(g.field_name, g.field_id, g.field_name);
      if (!field) continue;
      const sMin = g.start_min;
      const eMin = g.end_min || (sMin + 90);
      const d = new Date(`${g.scheduled_date}T00:00:00Z`);
      bookings.push({
        club_id: clubId, week_start: snapToMonday(g.scheduled_date),
        field_id: field.id, field_name: field.name, facility_name: field.facility_name || g.facility_name || '',
        date: g.scheduled_date, day: DAY_NAMES[d.getUTCDay()],
        start_min: sMin, end_min: eMin, start_time: minToDisplay(sMin), end_time: minToDisplay(eMin),
        type: 'game', event_type: 'match', team_name: g.home_team_name || '',
        source_ref: `game:${g.id}`, identity_key: `${clubId}|${field.id}|${g.scheduled_date}|${sMin}|${eMin}|game:${g.id}`,
      });
    }

    // Upsert in batches
    let created = 0, updated = 0;
    const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
    for (const chunk of chunks(bookings, 200)) {
      const res = await E.Booking.upsert(chunk, { key: 'identity_key' });
      created += res.created || 0;
      updated += res.updated || 0;
    }

    return Response.json({ success: true, total: bookings.length, created, updated, sources: { events: events.length, tryouts: tryouts.length, games: games.length } });
  } catch (error) {
    console.error('sync-field-allocations error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}