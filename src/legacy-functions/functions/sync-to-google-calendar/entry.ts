// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

const CONNECTOR_ID = "6a5e5fd10345f132609f7f11";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { entity_type, entity_id, event_type, tournament_id } = body;

    // Per-tenant Google Calendar: try the current app user's connection first
    // (APP_USER mode — each club admin connects their own from Connections).
    // Fall back to the shared platform connector for workflow-triggered syncs
    // (workflows run without a user context).
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn.accessToken;
    } catch (e) {
      try {
        const sharedConn = await base44.asServiceRole.connectors.getConnection('googlecalendar');
        accessToken = sharedConn.accessToken;
      } catch (e2) {
        return Response.json({ error: 'calendar_not_connected', message: 'Google Calendar is not connected. Connect it from the Connections page.' }, { status: 400 });
      }
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    // Bulk sync: sync all games for a tournament
    if (tournament_id && !entity_id) {
      return await syncAllGames(base44, headers, tournament_id);
    }

    if (!entity_type || !entity_id) {
      return Response.json({ error: 'entity_type and entity_id required' }, { status: 400 });
    }

    const extPropKey = entity_type === 'game' ? 'base44_game_id' : 'base44_booking_id';

    // Delete: find and remove the calendar event by extended property
    if (event_type === 'delete') {
      const deleted = await deleteCalendarEvent(headers, extPropKey, entity_id);
      return Response.json({ success: true, action: deleted ? 'deleted' : 'not_found' });
    }

    // Fetch the record
    let record;
    if (entity_type === 'game') {
      record = await base44.asServiceRole.entities.Game.get(entity_id).catch(() => null);
    } else if (entity_type === 'booking') {
      record = await base44.asServiceRole.entities.Booking.get(entity_id).catch(() => null);
      if (record && record.type !== 'training') {
        return Response.json({ success: true, skipped: true, reason: 'not a training session' });
      }
    }

    if (!record) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }

    // Build the calendar event
    const gEvent = buildEvent(record, entity_type, base44);
    if (!gEvent) {
      return Response.json({ success: true, skipped: true, reason: 'no scheduled date' });
    }

    // Check if event already exists (idempotent upsert)
    let existingId = null;
    try {
      const checkUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?privateExtendedProperty=${extPropKey}=${entity_id}&maxResults=1`;
      const checkRes = await fetch(checkUrl, { headers });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.items && checkData.items.length > 0) existingId = checkData.items[0].id;
      }
    } catch (e) { /* will create new */ }

    let action;
    if (existingId) {
      const updateRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingId}`, {
        method: 'PUT', headers, body: JSON.stringify(gEvent)
      });
      action = updateRes.ok ? 'updated' : 'update_failed';
    } else {
      const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST', headers, body: JSON.stringify(gEvent)
      });
      action = createRes.ok ? 'created' : 'create_failed';
    }

    return Response.json({ success: true, action, entity_type, entity_id });
  } catch (error) {
    console.error('sync-to-google-calendar error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function deleteCalendarEvent(headers, extPropKey, entityId) {
  try {
    const checkUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?privateExtendedProperty=${extPropKey}=${entityId}&maxResults=1`;
    const checkRes = await fetch(checkUrl, { headers });
    if (checkRes.ok) {
      const data = await checkRes.json();
      if (data.items && data.items.length > 0) {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${data.items[0].id}`, {
          method: 'DELETE', headers
        });
        return true;
      }
    }
  } catch (e) { /* ignore */ }
  return false;
}

function buildEvent(record, entityType, base44) {
  if (entityType === 'game') {
    return buildGameEvent(record);
  } else if (entityType === 'booking') {
    return buildBookingEvent(record);
  }
  return null;
}

function buildGameEvent(game) {
  if (!game.scheduled_date) return null;

  const startDate = new Date(`${game.scheduled_date}T00:00:00`);
  if (game.start_min != null) {
    startDate.setMinutes(startDate.getMinutes() + game.start_min);
  }

  const endDate = new Date(`${game.scheduled_date}T00:00:00`);
  if (game.end_min != null) {
    endDate.setMinutes(endDate.getMinutes() + game.end_min);
  } else if (game.start_min != null) {
    endDate.setMinutes(endDate.getMinutes() + game.start_min + 90);
  } else {
    endDate.setMinutes(endDate.getMinutes() + 90);
  }

  const summary = `${game.home_team_name || 'TBD'} vs ${game.away_team_name || 'TBD'}`;
  const location = [game.field_name, game.facility_name].filter(Boolean).join(', ');
  const description = [
    `Tournament Game`,
    game.round ? `Round: ${game.round}` : '',
    game.field_name ? `Field: ${game.field_name}` : '',
    game.referee_name ? `Referee: ${game.referee_name}` : '',
    game.status === 'completed' && game.home_score != null ? `Final: ${game.home_score} - ${game.away_score}` : '',
  ].filter(Boolean).join('\n');

  return {
    summary,
    location,
    description,
    start: { dateTime: startDate.toISOString(), timeZone: 'America/New_York' },
    end: { dateTime: endDate.toISOString(), timeZone: 'America/New_York' },
    extendedProperties: { private: { base44_game_id: game.id, base44_source: 'tournament' } }
  };
}

function buildBookingEvent(booking) {
  if (!booking.date) return null;

  const startDate = new Date(`${booking.date}T00:00:00`);
  if (booking.start_min != null) {
    startDate.setMinutes(startDate.getMinutes() + booking.start_min);
  }

  const endDate = new Date(`${booking.date}T00:00:00`);
  if (booking.end_min != null) {
    endDate.setMinutes(endDate.getMinutes() + booking.end_min);
  } else if (booking.start_min != null) {
    endDate.setMinutes(endDate.getMinutes() + booking.start_min + 60);
  } else {
    endDate.setMinutes(endDate.getMinutes() + 60);
  }

  const summary = `Training: ${booking.team_name || booking.coach_name || 'Session'}`;
  const location = [booking.field_name, booking.facility_name].filter(Boolean).join(', ');
  const description = [
    `Training Session`,
    booking.team_name ? `Team: ${booking.team_name}` : '',
    booking.coach_name ? `Coach: ${booking.coach_name}` : '',
    booking.field_name ? `Field: ${booking.field_name}` : '',
    booking.platform_name ? `Platform: ${booking.platform_name}` : '',
    booking.notes || '',
  ].filter(Boolean).join('\n');

  return {
    summary,
    location,
    description,
    start: { dateTime: startDate.toISOString(), timeZone: 'America/New_York' },
    end: { dateTime: endDate.toISOString(), timeZone: 'America/New_York' },
    extendedProperties: { private: { base44_booking_id: booking.id, base44_source: 'training' } }
  };
}

async function syncAllGames(base44, headers, tournamentId) {
  const tournament = await base44.asServiceRole.entities.Tournament.get(tournamentId).catch(() => null);
  if (!tournament) return Response.json({ error: 'Tournament not found' }, { status: 404 });

  const gamesPage = await base44.asServiceRole.entities.Game.filter({ tournament_id: tournamentId });
  const games = gamesPage.items || [];

  const results = { synced: 0, failed: 0, skipped: 0, errors: [] };

  for (const game of games) {
    if (!game.scheduled_date) { results.skipped++; continue; }

    const gEvent = buildGameEvent(game);
    if (!gEvent) { results.skipped++; continue; }

    try {
      let existingId = null;
      const checkUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?privateExtendedProperty=base44_game_id=${game.id}&maxResults=1`;
      const checkRes = await fetch(checkUrl, { headers });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.items && checkData.items.length > 0) existingId = checkData.items[0].id;
      }

      if (existingId) {
        const updateRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingId}`, {
          method: 'PUT', headers, body: JSON.stringify(gEvent)
        });
        if (updateRes.ok) results.synced++; else { results.failed++; results.errors.push(`Update failed for ${game.home_team_name} vs ${game.away_team_name}`); }
      } else {
        const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST', headers, body: JSON.stringify(gEvent)
        });
        if (createRes.ok) results.synced++; else { results.failed++; results.errors.push(`Create failed for ${game.home_team_name} vs ${game.away_team_name}`); }
      }
    } catch (e) {
      results.failed++;
      results.errors.push(`${game.home_team_name} vs ${game.away_team_name}: ${e.message}`);
    }
  }

  return Response.json({ success: true, ...results, total_games: games.length });
}