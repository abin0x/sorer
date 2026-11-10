import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const CONNECTOR_ID = "6a5e5fd10345f132609f7f11";

/**
 * System-owner/admin only: deletes ALL Base44-synced events from the
 * connected Google Calendar. Used to clean up orphaned calendar entries
 * left behind when a club was deleted before the calendar cleanup logic
 * was added to delete-club.
 *
 * Lists every event on the primary calendar that has a
 * base44_source extended property (field_board, training, tournament,
 * club_nexus) and deletes it. Safe to run at any time — it only removes
 * events the platform created, never user-created events.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAuthorized =
      user.role === 'admin' ||
      user.is_super_admin === true ||
      user.system_role === 'system_owner' ||
      user.system_role === 'system_admin';
    if (!isAuthorized) return Response.json({ error: 'Forbidden' }, { status: 403 });

    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn.accessToken;
    } catch (e) {
      try {
        const sharedConn = await base44.asServiceRole.connectors.getConnection('googlecalendar');
        accessToken = sharedConn.accessToken;
      } catch (e2) {
        return Response.json({ error: 'Google Calendar is not connected.' }, { status: 400 });
      }
    }

    const headers = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
    const SOURCES = ['field_board', 'training', 'tournament', 'club_nexus'];
    let totalFound = 0;
    let totalDeleted = 0;
    let totalFailed = 0;

    for (const source of SOURCES) {
      let pageToken = null;
      do {
        let url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?privateExtendedProperty=base44_source=${source}&maxResults=250&singleEvents=true`;
        if (pageToken) url += `&pageToken=${pageToken}`;

        const listRes = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
        if (!listRes.ok) {
          const err = await listRes.json().catch(() => ({}));
          return Response.json({ error: 'Google API error', details: err, source }, { status: listRes.status });
        }

        const data = await listRes.json();
        const events = data.items || [];
        totalFound += events.length;

        // Delete in batches of 10
        for (let i = 0; i < events.length; i += 10) {
          const batch = events.slice(i, i + 10);
          const results = await Promise.allSettled(batch.map(async (ev) => {
            const delRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${ev.id}`, {
              method: 'DELETE', headers, signal: AbortSignal.timeout(10000),
            });
            return delRes.ok;
          }));
          results.forEach((r) => {
            if (r.status === 'fulfilled' && r.value === true) totalDeleted++;
            else totalFailed++;
          });
        }

        pageToken = data.nextPageToken;
      } while (pageToken);
    }

    return Response.json({ success: true, totalFound, totalDeleted, totalFailed });
  } catch (error) {
    console.error('cleanup-orphaned-calendar-events error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}