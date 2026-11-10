// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

const CONNECTOR_ID = "6a5e5fd10345f132609f7f11";

function minToISO(dateStr, min) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMinutes(d.getMinutes() + min);
  return d.toISOString();
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

function buildGEvent(b) {
  if (!b.date || b.start_min == null) return null;
  const startDate = new Date(`${b.date}T00:00:00`);
  startDate.setMinutes(startDate.getMinutes() + b.start_min);
  const endDate = new Date(`${b.date}T00:00:00`);
  endDate.setMinutes(endDate.getMinutes() + (b.end_min != null ? b.end_min : b.start_min + 60));
  const isGame = b.type === 'game';
  const summary = isGame ? `Game: ${b.team_name || 'TBD'}` : `Training: ${b.team_name || b.coach_name || 'Session'}`;
  const location = [b.field_name, b.facility_name].filter(Boolean).join(', ');
  const description = [
    isGame ? 'Game' : 'Training Session',
    b.team_name ? `Team: ${b.team_name}` : '',
    b.coach_name ? `Coach: ${b.coach_name}` : '',
    b.field_name ? `Field: ${b.field_name}` : '',
  ].filter(Boolean).join('\n');
  return {
    summary, location, description,
    start: { dateTime: startDate.toISOString(), timeZone: 'America/New_York' },
    end: { dateTime: endDate.toISOString(), timeZone: 'America/New_York' },
    extendedProperties: { private: { base44_booking_id: b.id, base44_source: 'field_board' } },
  };
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
    const query = weekStart ? { club_id: clubId, week_start: weekStart } : { club_id: clubId };
    const bookings = await pageAll(E.Booking, query);

    // --- 1. Sync to CalendarEvent (in-app TeamCalendar) ---
    const calEvents = await pageAll(E.CalendarEvent, { club_id: clubId });
    const calMap = new Map();
    calEvents.forEach((ce) => { if (ce.field_id && ce.start_datetime) calMap.set(`${ce.field_id}|${ce.start_datetime}`, ce); });

    let calCreated = 0, calUpdated = 0;
    const toCreate = [];
    const toUpdate = [];
    for (const b of bookings) {
      if (!b.date || b.start_min == null) continue;
      const startDT = minToISO(b.date, b.start_min);
      const endDT = b.end_min != null ? minToISO(b.date, b.end_min) : minToISO(b.date, b.start_min + 60);
      const isGame = b.type === 'game';
      const title = isGame ? `Game: ${b.team_name || 'TBD'}` : `Training: ${b.team_name || b.coach_name || 'Session'}`;
      const eventType = isGame ? 'game' : 'practice';
      const key = `${b.field_id}|${startDT}`;
      const existing = calMap.get(key);
      const data = {
        club_id: clubId, title, event_type: eventType,
        start_datetime: startDT, end_datetime: endDT,
        location_text: [b.field_name, b.facility_name].filter(Boolean).join(', '),
        field_id: b.field_id, field_name: b.field_name,
        team_names: b.team_name ? [b.team_name] : [],
      };
      if (existing) { toUpdate.push({ id: existing.id, ...data }); calUpdated++; }
      else { toCreate.push({ ...data, status: 'confirmed', visibility: 'club_wide' }); calCreated++; }
    }
    const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
    for (const c of chunks(toCreate, 200)) await E.CalendarEvent.bulkCreate(c);
    for (const c of chunks(toUpdate, 200)) await E.CalendarEvent.bulkUpdate(c);

    // --- 2. Sync to Google Calendar ---
    let googleSynced = 0, googleFailed = 0, googleError = null;
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn.accessToken;
    } catch (e) {
      try {
        const sharedConn = await base44.asServiceRole.connectors.getConnection('googlecalendar');
        accessToken = sharedConn.accessToken;
      } catch (e2) {
        googleError = 'Google Calendar not connected';
      }
    }

    if (accessToken) {
      const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
      // Process in batches of 6
      const batchChunks = chunks(bookings.filter((b) => b.date && b.start_min != null), 6);
      for (const batch of batchChunks) {
        const results = await Promise.allSettled(batch.map(async (b) => {
          const gEvent = buildGEvent(b);
          if (!gEvent) return 'skip';
          let existingId = null;
          try {
            const checkRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?privateExtendedProperty=base44_booking_id=${b.id}&maxResults=1`, { headers, signal: AbortSignal.timeout(10000) });
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (checkData.items && checkData.items.length > 0) existingId = checkData.items[0].id;
            }
          } catch (e) { /* will create */ }
          const method = existingId ? 'PUT' : 'POST';
          const url = existingId ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingId}` : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
          const res = await fetch(url, { method, headers, body: JSON.stringify(gEvent), signal: AbortSignal.timeout(10000) });
          return res.ok ? 'ok' : 'fail';
        }));
        results.forEach((r) => {
          if (r.status === 'fulfilled' && r.value === 'ok') googleSynced++;
          else if (r.status === 'fulfilled' && r.value === 'fail') googleFailed++;
          else if (r.status === 'rejected') googleFailed++;
        });
      }
    }

    return Response.json({ success: true, total: bookings.length, calCreated, calUpdated, googleSynced, googleFailed, googleError });
  } catch (error) {
    console.error('sync-bookings-to-calendar error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}