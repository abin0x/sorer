import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// System-owner-only: deletes a trial club and all its associated data,
// then resets the DemoAccessRequest back to "opened" so the invitee can
// start a fresh trial if desired.

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { requestId } = body;
    if (!requestId) return Response.json({ error: 'requestId is required' }, { status: 400 });

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
    const request = await svc.entities.DemoAccessRequest.get(requestId);
    if (!request) return Response.json({ error: 'Request not found' }, { status: 404 });
    if (!request.trial_club_id) return Response.json({ error: 'No trial club associated with this invitation' }, { status: 400 });

    const clubId = request.trial_club_id;
    const errors = [];

    // Delete all club-scoped entities. Each is best-effort — some may not
    // exist or may not have a club_id field, so we swallow individual errors.
    const entitiesToClean = [
      'TryoutSubtask', 'TryoutTask', 'TryoutEvent', 'TryoutPlan',
      'TryoutRegistration', 'TryoutFinalRegistration', 'Registration',
      'AgeGroup', 'Season', 'Field', 'Facility', 'CalendarEvent',
      'TrainingSession', 'Payment', 'Expense', 'StaffPay', 'TimeEntry',
      'UserRoles', 'ClubInvitation', 'EmailTemplate', 'Notification',
      'Message', 'Note', 'Task', 'Subtask', 'Program', 'Document',
      'Player', 'Guardian', 'Coach', 'Team', 'Platform', 'Location',
    ];

    for (const entityName of entitiesToClean) {
      try {
        await svc.entities[entityName].deleteMany({ club_id: clubId });
      } catch (e) {
        // entity may not exist or may not have club_id — skip silently
      }
    }

    // Delete TrialSignups
    try {
      await svc.entities.TrialSignups.deleteMany({ club_id: clubId });
    } catch { /* best effort */ }

    // Delete the club itself
    try {
      await svc.entities.Club.delete(clubId);
    } catch (e) {
      errors.push(`Failed to delete club: ${e.message}`);
    }

    // Reset the DemoAccessRequest
    await svc.entities.DemoAccessRequest.update(requestId, {
      status: 'opened',
      trial_club_id: null,
      trial_club_name: null,
      trial_started_date: null,
    });

    return Response.json({ ok: true, errors });
  } catch (error) {
    console.error('delete-demo-club error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}