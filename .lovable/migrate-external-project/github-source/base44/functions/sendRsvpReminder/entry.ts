import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { Resend } from 'npm:resend@3.2.0';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { event_id } = body;
    if (!event_id) return Response.json({ error: 'event_id is required' }, { status: 400 });

    const event = await base44.asServiceRole.entities.CalendarEvent.get(event_id);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

    const teams = await base44.asServiceRole.entities.Team.list("name", 200);
    const eventTeamIds = event.team_ids || [];
    const eventTeams = teams.filter(t => eventTeamIds.includes(t.id));
    const playerIds = [...new Set(eventTeams.flatMap(t => t.player_ids || []))];

    const players = await base44.asServiceRole.entities.Player.list("-created_date", 500);
    const guardians = await base44.asServiceRole.entities.Guardian.list("-created_date", 500);

    const rsvps = event.rsvps || {};
    const nonResponders = players.filter(p => playerIds.includes(p.id) && !rsvps[p.id]);

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const eventDate = new Date(event.start_datetime).toLocaleString("en-US", { timeZone: "America/New_York" });

    let sent = 0;
    for (const player of nonResponders) {
      const guardian = guardians.find(g => g.id === player.guardian_id);
      if (guardian?.email) {
        try {
          await resend.emails.send({
            from: 'Club Rudder OS <welcome@clubrudder.com>',
            to: [guardian.email],
            subject: `RSVP Reminder: ${event.title}`,
            html: `<p>Hi ${guardian.first_name},</p><p>This is a reminder to RSVP for <strong>${event.title}</strong> on ${eventDate}${event.location_text ? ` at ${event.location_text}` : ''}.</p><p>Please mark ${player.first_name}'s attendance in the app.</p>`,
          });
          sent++;
        } catch (e) { console.error(`Failed to send to ${guardian.email}:`, e.message); }
      }
    }

    return Response.json({ success: true, sent, total: nonResponders.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}