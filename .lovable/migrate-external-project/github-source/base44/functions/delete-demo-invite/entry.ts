import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// System-owner-only: deletes a DemoAccessRequest invitation entirely.
// If the invitation has an associated trial club, deletes the club and
// all its data first, then removes the DemoAccessRequest record itself.

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

    const errors = [];

    // If there's an associated trial club, delete it and all its data
    if (request.trial_club_id) {
      const clubId = request.trial_club_id;
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
        } catch { /* skip */ }
      }
      try { await svc.entities.TrialSignups.deleteMany({ club_id: clubId }); } catch {}
      try { await svc.entities.Club.delete(clubId); } catch (e) {
        errors.push(`Failed to delete club: ${e.message}`);
      }
    }

    // Delete the DemoAccessRequest record itself
    try {
      await svc.entities.DemoAccessRequest.delete(requestId);
    } catch (e) {
      errors.push(`Failed to delete invitation: ${e.message}`);
    }

    return Response.json({ ok: true, errors });
  } catch (error) {
    console.error('delete-demo-invite error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}