import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Admin-triggered compliance reminder: sends a branded warning email to a
// specific coach and logs an in-app notification. Called from the ClubStaff
// page when an admin clicks "Send Reminder" on a non-compliant coach.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin = user.role === 'admin' || ['system_owner', 'system_admin'].includes(user.system_role || '');
    if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { coach_email, coach_name, items, season_name } = body;
    if (!coach_email || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'coach_email and items[] are required' }, { status: 400 });
    }

    const itemsText = items.join('\n');
    const season = season_name || 'current season';
    const clubId = user.club_id || '';

    // Send branded warning email
    await base44.integrations.Core.SendEmail({
      to: coach_email,
      template_name: 'ComplianceWarning',
      variables: { coach_name: coach_name || 'Coach', season: season, items: itemsText },
    }).catch((e: Error) => console.error('compliance reminder email failed', coach_email, e.message));

    // In-app notification so the coach sees it in their bell
    if (clubId) {
      await base44.asServiceRole.entities.Notification.create({
        club_id: clubId,
        user_email: coach_email,
        type: 'announcement',
        delivery: 'push',
        title: 'Compliance action needed',
        message: `Your compliance status needs attention for the ${season} season. Items: ${items.join(', ')}.`,
        link: '/MyCompliance',
      }).catch((e: Error) => console.error('notification create failed', e.message));
    }

    return Response.json({ success: true, sent_to: coach_email });
  } catch (error) {
    console.error('compliance-reminder error', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}