// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';

/**
 * System-owner/admin only: permanently deletes a club AND cascades all
 * related data so no stale references remain.
 *
 * - Deletes every club-scoped entity (UserRoles, ClubInvitations, teams,
 *   players, guardians, payments, etc.)
 * - Nulls out `club_id` on every User record that pointed to the deleted
 *   club so those users aren't locked out of the platform.
 * - Deletes the Club record itself.
 *
 * This is the function the TenantsTab "Delete Permanently" button should
 * call — never delete a Club directly, or orphaned UserRoles and stale
 * User.club_id pointers will block users from logging in.
 */
export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { clubId } = body;
    if (!clubId) return Response.json({ error: 'clubId is required' }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAuthorized =
      user.role === 'admin' ||
      user.is_super_admin === true ||
      user.system_role === 'system_owner' ||
      user.system_role === 'system_admin';
    if (!isAuthorized) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = base44.asServiceRole;

    // Verify the club exists
    const club = await svc.entities.Club.get(clubId).catch(() => null);
    if (!club) return Response.json({ error: 'Club not found' }, { status: 404 });

    const errors = [];

    // --- Clean up Google Calendar events BEFORE deleting the records ---
    // Bookings, Games, and CalendarEvents are synced to Google Calendar
    // with extended properties (base44_booking_id, base44_game_id,
    // base44_event_id). If we delete the DB records first, we lose the IDs
    // and can't find the calendar events to remove — leaving orphans on
    // the user's Google Calendar that can never be cleaned up.
    let googleToken = null;
    try {
      const conn = await svc.connectors.getConnection('googlecalendar');
      googleToken = conn.accessToken;
    } catch (e) {
      try {
        const appUserConn = await svc.connectors.getCurrentAppUserConnection('6a5e5fd10345f132609f7f11');
        googleToken = appUserConn.accessToken;
      } catch (e2) { /* Google Calendar not connected — nothing to clean */ }
    }

    if (googleToken) {
      const gHeaders = { 'Authorization': `Bearer ${googleToken}`, 'Content-Type': 'application/json' };
      const cleanupMaps = [
        { entity: 'Booking', propKey: 'base44_booking_id' },
        { entity: 'Game', propKey: 'base44_game_id' },
        { entity: 'CalendarEvent', propKey: 'base44_event_id' },
      ];
      for (const { entity, propKey } of cleanupMaps) {
        try {
          const allIds = [];
          let cursor;
          do {
            const page = await svc.entities[entity].filter({ club_id: clubId }, { limit: 500, cursor, fields: ['id'] });
            allIds.push(...(page.items || []));
            cursor = page.has_more ? page.next_cursor : null;
          } while (cursor);

          if (allIds.length === 0) continue;

          // Delete Google Calendar events in batches of 10
          for (let i = 0; i < allIds.length; i += 10) {
            const batch = allIds.slice(i, i + 10);
            await Promise.allSettled(batch.map(async (record) => {
              try {
                const listUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?privateExtendedProperty=${propKey}=${record.id}&maxResults=1`;
                const listRes = await fetch(listUrl, { headers: gHeaders, signal: AbortSignal.timeout(8000) });
                if (!listRes.ok) return;
                const data = await listRes.json();
                if (data.items && data.items.length > 0) {
                  await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${data.items[0].id}`, {
                    method: 'DELETE', headers: gHeaders, signal: AbortSignal.timeout(8000),
                  });
                }
              } catch (e) { /* best-effort */ }
            }));
          }
        } catch (e) {
          errors.push(`Google Calendar cleanup for ${entity}: ${e.message}`);
        }
      }
    }

    // Delete all club-scoped entities. Best-effort — some may not exist or
    // may not have a club_id field.
    const entitiesToClean = [
      'MigrationJob', 'MarketplaceOrder', 'Offer', 'SpiritwearProduct',
      'ClubSubscription', 'ClubEvent', 'EventRegistration', 'PromoCode',
      'TryoutSubtask', 'TryoutTask', 'TryoutEvent', 'TryoutPlan',
      'TryoutRegistration', 'TryoutFinalRegistration', 'Registration',
      'AgeGroup', 'Season', 'Field', 'Facility', 'CalendarEvent',
      'TrainingSession', 'Payment', 'StripePayout', 'ExpenseLine',
      'ExpenseReport', 'ExpenseType', 'ExpenseNotificationSettings',
      'StaffPay', 'TimeEntry', 'UserRoles', 'ClubInvitation',
      'EmailTemplate', 'Notification', 'Channel', 'ChannelMessage',
      'NotificationPreference', 'Message', 'Note', 'Task', 'Subtask',
      'Program', 'Document', 'Player', 'Guardian', 'Coach', 'Team',
      'Platform', 'PlatformAccess', 'Location', 'ClubSetupProgress',
      'ClubQuickBooksConnection', 'ClubCredential', 'PaymentProcessor',
      'PricingQuote', 'SupportTicket', 'AuditLog', 'PriorityAuditLog',
      'Booking', 'Game', 'BookingGrid', 'Conflict', 'ImportBatch',
      'ScheduleTeam', 'Tournament', 'TournamentRegistration', 'Standing',
      'Referee', 'Post', 'Campaign', 'SocialAccount', 'MarketingSettings',
      'PostTemplate', 'Event', 'EventOccurrence', 'EventField',
      'EventLocation', 'RecurrenceRule', 'Session', 'GroupSession',
      'Group', 'Expense', 'PhysicalAssessment', 'SkillTest',
      'SkillTestScore', 'PlayerEvaluation', 'PlayerFeedback', 'PlayerNote',
      'TrainingVideo', 'TrainingSession', 'TeamPlan', 'ClientJourney',
      'RoadmapTask', 'RoadmapProject', 'ProgramTemplate', 'ProgramFeedback',
      'ScheduledReport', 'Category', 'EmailLog', 'CurriculumDocument',
      'TestBenchmark', 'Base44Purchase', 'NotificationMatrix', 'League',
      'Plugin', 'RBACConfig', 'AppConfig', 'ClubSignupRequest',
      'DemoAccessRequest', 'TrialSignups', 'TenantModule',
      'TenantSubscription', 'EntitlementEvent', 'StripeWebhookEvent',
    ];

    // Batch in groups of 6 to respect connection limits
    for (let i = 0; i < entitiesToClean.length; i += 6) {
      const batch = entitiesToClean.slice(i, i + 6);
      await Promise.allSettled(batch.map(async (entityName) => {
        try {
          await svc.entities[entityName].deleteMany({ club_id: clubId });
        } catch { /* entity may not exist or lack club_id — skip */ }
      }));
    }

    // Null out club_id on every User that pointed to this club so they
    // aren't locked out of the platform with a stale reference.
    try {
      const affectedUsers = await svc.entities.User.filter({ club_id: clubId });
      if (affectedUsers.length > 0) {
        await Promise.allSettled(affectedUsers.map(u =>
          svc.entities.User.update(u.id, { club_id: null }).catch(() => {})
        ));
      }
    } catch (e) {
      errors.push(`Failed to reset user club_id: ${e.message}`);
    }

    // Delete the club itself
    try {
      await svc.entities.Club.delete(clubId);
    } catch (e) {
      errors.push(`Failed to delete club: ${e.message}`);
    }

    return Response.json({ ok: true, deletedClubId: clubId, errors });
  } catch (error) {
    console.error('delete-club error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}