// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const bookingId = body.booking_id;
    if (!bookingId) return Response.json({ error: 'booking_id required' }, { status: 400 });

    const E = base44.asServiceRole.entities;
    const booking = await E.Booking.get(bookingId).catch(() => null);
    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.type !== 'game' && booking.event_type !== 'match') {
      return Response.json({ error: 'Not a game booking' }, { status: 400 });
    }

    // Update booking to confirmed + notified
    await E.Booking.update(bookingId, { status: 'confirmed', notified: true });

    // Find teams by name to get coach info
    const teamNames = [booking.team_name, booking.away_team_name].filter(Boolean);
    let coachEmails = [];
    let coachNames = [];
    if (teamNames.length) {
      const teamsPage = await E.Team.filter({ club_id: booking.club_id }, { limit: 500 });
      const teams = (teamsPage.items || []).filter((t) => teamNames.includes(t.name));
      teams.forEach((t) => {
        if (t.coach_names?.length) coachNames.push(...t.coach_names);
        else if (t.coach_name) coachNames.push(t.coach_name);
      });
    }

    // Find user emails for coaches
    if (coachNames.length) {
      const usersPage = await E.User.filter({}, { limit: 500 });
      const users = (usersPage.items || []).filter((u) => u.club_id === booking.club_id && coachNames.includes(u.full_name));
      coachEmails = users.map((u) => u.email).filter(Boolean);
    }

    // Also notify club admins
    const adminsPage = await E.User.filter({}, { limit: 500 });
    const adminEmails = (adminsPage.items || []).filter((u) => u.club_id === booking.club_id && (u.role === 'admin' || u.custom_role === 'club_director' || u.custom_role === 'club_admin')).map((u) => u.email).filter(Boolean);

    const allEmails = [...new Set([...coachEmails, ...adminEmails])];

    // Build notification content
    const gameTitle = `${booking.team_name || 'TBD'} vs ${booking.away_team_name || 'TBD'}`;
    const gameDetail = `${booking.date} at ${booking.start_time} - ${booking.end_time} on ${booking.field_name}${booking.facility_name ? ` (${booking.facility_name})` : ''}`;
    const scheduleInfo = [
      booking.referee_name ? `Referee: ${booking.referee_name}` : null,
      booking.trainer_name ? `Trainer: ${booking.trainer_name}` : null,
      booking.volunteer_names?.length ? `Volunteers: ${booking.volunteer_names.join(', ')}` : null,
      booking.video_setup ? `Video: ${booking.video_setup}` : null,
    ].filter(Boolean).join(' | ');

    // Create notifications for each recipient
    const notifications = allEmails.map((email) => ({
      club_id: booking.club_id,
      user_email: email,
      type: 'announcement',
      title: `Game Confirmed: ${gameTitle}`,
      message: `${gameDetail}${scheduleInfo ? `\n${scheduleInfo}` : ''}`,
      read: false,
    }));

    if (notifications.length) {
      const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
      for (const chunk of chunks(notifications, 100)) {
        await E.Notification.bulkCreate(chunk);
      }
    }

    // Send email notification
    if (allEmails.length) {
      try {
        await base44.integrations.Core.SendEmail({
          to: allEmails[0],
          subject: `Game Confirmed: ${gameTitle}`,
          body: `<h2>Game Confirmed</h2><p><strong>${gameTitle}</strong></p><p>${gameDetail}</p>${scheduleInfo ? `<p>${scheduleInfo.split(' | ').join('<br>')}</p>` : ''}<p>Please review the schedule and prepare accordingly.</p>`,
        });
      } catch (e) {
        console.error('Email send failed:', e.message);
      }
    }

    return Response.json({
      success: true,
      booking_id: bookingId,
      notified_count: allEmails.length,
      coach_emails: coachEmails,
      admin_emails: adminEmails,
    });
  } catch (error) {
    console.error('confirm-game-booking error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}