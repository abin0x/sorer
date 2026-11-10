import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';

// System-owner-only: resends the invite email for an existing invitation,
// reusing the existing access token (no new token generated).

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
    if (!request.access_token) return Response.json({ error: 'No access token — send an invite first' }, { status: 400 });

    const demoLink = `https://www.clubrudder.com/demo?token=${request.access_token}`;

    // Load the editable email template
    let tmpl = null;
    try {
      const templates = await svc.entities.EmailTemplate.filter({ template_type: 'demo_access_invite', is_active: true });
      tmpl = templates?.[0] || null;
    } catch { /* fall back to default */ }

    const defaultSubject = `Reminder: ${user.full_name || 'ClubRudder'} invited you to try the demo`;
    const defaultBody = `<div style="color:#334155;font-size:15px;line-height:1.7;">
          <p>Hi ${request.name || 'there'},</p>
          <p>This is a friendly reminder — ${user.full_name || 'the ClubRudder team'} invited you to try the ClubRudder interactive demo, but you haven't launched it yet.</p>
          <p>ClubRudder is the all-in-one platform for multi-branch club management — scheduling, payments, communications, rosters, and more, all in one place.</p>
          <p style="margin:24px 0;">
            <a href="${demoLink}" style="display:inline-block;background:#4f46e5;color:#fff;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">Launch Interactive Demo</a>
          </p>
          <p>The demo walks you through setting up a club, adding branches, selecting competitive platforms, and rolling over your first season — with real data saved to a trial account.</p>
          <p>— The ClubRudder Team</p>
        </div>`;

    let emailSubject = defaultSubject;
    let emailBody = defaultBody;
    if (tmpl) {
      emailSubject = (tmpl.subject || defaultSubject)
        .replace(/\{\{inviter_name\}\}/g, user.full_name || 'ClubRudder')
        .replace(/\{\{name\}\}/g, request.name || 'there')
        .replace(/\{\{club_name\}\}/g, request.club_name || '')
        .replace(/\{\{demo_link\}\}/g, demoLink);
      emailBody = (tmpl.body || defaultBody)
        .replace(/\{\{inviter_name\}\}/g, user.full_name || 'ClubRudder')
        .replace(/\{\{name\}\}/g, request.name || 'there')
        .replace(/\{\{club_name\}\}/g, request.club_name || '')
        .replace(/\{\{demo_link\}\}/g, demoLink);
    }

    let emailSent = false;
    let emailError = null;
    try {
      await sendBrandedEmail(base44, { to: request.email, subject: emailSubject, body: emailBody });
      emailSent = true;
      await svc.entities.DemoAccessRequest.update(requestId, {
        invite_sent: true,
        invite_sent_date: new Date().toISOString(),
      });
    } catch (emailErr) {
      emailError = emailErr.message || String(emailErr);
      console.error('Failed to send reminder email:', emailErr);
    }

    return Response.json({ ok: true, emailSent, emailError });
  } catch (error) {
    console.error('send-demo-reminder error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}