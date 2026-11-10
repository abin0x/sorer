import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const CONNECTOR_ID = "6a5e5fd10345f132609f7f11";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get the current app user's Google Calendar connection (APP_USER mode)
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn.accessToken;
    } catch (e) {
      return Response.json({ error: 'not_connected', message: 'Google Calendar is not connected for this user.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'sync'; // 'sync' or 'list'

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    if (action === 'list') {
      // List upcoming events from the user's primary Google Calendar
      const timeMin = new Date().toISOString();
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=50&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return Response.json({ error: 'google_api_error', details: err }, { status: res.status });
      }
      const data = await res.json();
      return Response.json({ events: (data.items || []).map((ev) => ({
        id: ev.id, title: ev.summary || '(No title)', start: ev.start, end: ev.end, location: ev.location
      })) });
    }

    // action === 'sync' — push the user's manageable team events to their Google Calendar
    const { events: teamEvents = [] } = body;
    if (!Array.isArray(teamEvents) || teamEvents.length === 0) {
      return Response.json({ error: 'No events provided for sync.' }, { status: 400 });
    }

    const results = { created: 0, updated: 0, failed: 0, errors: [] };

    for (const ev of teamEvents) {
      const startISO = ev.start_datetime ? new Date(ev.start_datetime).toISOString() : null;
      const endISO = ev.end_datetime ? new Date(ev.end_datetime).toISOString() : (ev.start_datetime ? new Date(new Date(ev.start_datetime).getTime() + 60 * 60 * 1000).toISOString() : null);
      if (!startISO) { results.failed++; results.errors.push(`Event ${ev.title || ev.id}: missing start time`); continue; }

      const gEvent = {
        summary: ev.title || 'Team Event',
        location: ev.location_text || '',
        description: [
          ev.event_type ? `Type: ${ev.event_type}` : '',
          ev.team_names?.length ? `Teams: ${ev.team_names.join(', ')}` : '',
          ev.notes || ''
        ].filter(Boolean).join('\n'),
        start: { dateTime: startISO, timeZone: 'America/New_York' },
        end: { dateTime: endISO, timeZone: 'America/New_York' },
        extendedProperties: { private: { base44_event_id: ev.id || '', base44_source: 'club_nexus' } }
      };

      // Check if an event with our extended property already exists (idempotent update)
      let existingId = null;
      try {
        const checkUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?privateExtendedProperty=base44_event_id=${ev.id}&maxResults=1`;
        const checkRes = await fetch(checkUrl, { headers });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.items && checkData.items.length > 0) existingId = checkData.items[0].id;
        }
      } catch (e) { /* ignore — will create new */ }

      try {
        if (existingId) {
          const updateRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingId}`, {
            method: 'PUT', headers, body: JSON.stringify(gEvent)
          });
          if (updateRes.ok) results.updated++; else { results.failed++; results.errors.push(`Update failed for ${ev.title}`); }
        } else {
          const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST', headers, body: JSON.stringify(gEvent)
          });
          if (createRes.ok) results.created++; else { results.failed++; results.errors.push(`Create failed for ${ev.title}`); }
        }
      } catch (e) {
        results.failed++;
        results.errors.push(`${ev.title || ev.id}: ${e.message}`);
      }
    }

    return Response.json({ success: true, ...results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}