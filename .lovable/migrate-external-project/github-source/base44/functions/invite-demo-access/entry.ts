import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';

// Admin-only: directly invites someone to try the demo by creating an
// approved DemoAccessRequest and sending them an invite email with a
// tokenized link to /demo?token=xxx.

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, name, clubName, sport, branchCount, message } = body;

    if (!email) return Response.json({ error: 'Email is required' }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = base44.asServiceRole;

    // Check for an existing request from this email
    const existing = await svc.entities.DemoAccessRequest.filter({ email });
    const token = crypto.randomUUID();

    const nowIso = new Date().toISOString();
    if (existing?.length > 0) {
      // Update the existing request to invited with a new token
      await svc.entities.DemoAccessRequest.update(existing[0].id, {
        status: 'invited',
        access_token: token,
        source: 'invite',
        name: name || existing[0].name,
        club_name: clubName || existing[0].club_name,
        sport: sport || existing[0].sport,
        branch_count: branchCount || existing[0].branch_count,
        message: message || existing[0].message,
        reviewed_by: user.email,
        reviewed_date: nowIso,
        invite_sent: true,
        invite_sent_date: nowIso,
        invite_opened_date: null,
        trial_club_id: null,
        trial_club_name: null,
        trial_started_date: null,
      });
    } else {
      await svc.entities.DemoAccessRequest.create({
        email,
        name: name || '',
        club_name: clubName || '',
        sport: sport || '',
        branch_count: branchCount || '',
        message: message || '',
        status: 'invited',
        source: 'invite',
        access_token: token,
        reviewed_by: user.email,
        reviewed_date: nowIso,
        invite_sent: true,
        invite_sent_date: nowIso,
      });
    }

    // Build the demo link — always use the custom public domain
    const demoLink = `https://www.clubrudder.com/demo?token=${token}`;

    // Load the editable email template from the database (if one exists)
    let tmpl = null;
    try {
      const templates = await svc.entities.EmailTemplate.filter({ template_type: 'demo_access_invite', is_active: true });
      tmpl = templates?.[0] || null;
    } catch { /* fall back to default */ }

    const defaultSubject = `${user.full_name || 'ClubRudder'} invited you to try the demo`;
    const defaultBody = `<div style="color:#334155;font-size:15px;line-height:1.7;">
          <p>Hi ${name || 'there'},</p>
          <p>${user.full_name || 'The ClubRudder team'} has invited you to try the ClubRudder interactive demo.</p>
          <p>ClubRudder is the all-in-one platform for multi-branch club management — scheduling, payments, communications, rosters, and more, all in one place.</p>
          <p style="margin:24px 0;">
            <a href="${demoLink}" style="display:inline-block;background:#4f46e5;color:#fff;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">Launch Interactive Demo</a>
          </p>
          <p>The demo walks you through setting up a club, adding branches, selecting competitive platforms, and rolling over your first season — with real data saved to a trial account.</p>
          <p>— The ClubRudder Team</p>
        </div>`;

    // Replace placeholders in the custom template (if any)
    let emailSubject = defaultSubject;
    let emailBody = defaultBody;
    if (tmpl) {
      emailSubject = (tmpl.subject || defaultSubject)
        .replace(/\{\{inviter_name\}\}/g, user.full_name || 'ClubRudder')
        .replace(/\{\{name\}\}/g, name || 'there')
        .replace(/\{\{club_name\}\}/g, clubName || '')
        .replace(/\{\{demo_link\}\}/g, demoLink);
      emailBody = (tmpl.body || defaultBody)
        .replace(/\{\{inviter_name\}\}/g, user.full_name || 'ClubRudder')
        .replace(/\{\{name\}\}/g, name || 'there')
        .replace(/\{\{club_name\}\}/g, clubName || '')
        .replace(/\{\{demo_link\}\}/g, demoLink);
    }

    // Send invite email
    let emailSent = false;
    let emailError = null;
    try {
      await sendBrandedEmail(base44, {
        to: email,
        subject: emailSubject,
        body: emailBody,
      });
      emailSent = true;
    } catch (emailErr) {
      emailError = emailErr.message || String(emailErr);
      console.error('Failed to send invite email:', emailErr);
      // Roll back the invite_sent flag so the admin can see it wasn't sent
      try {
        const existing2 = await svc.entities.DemoAccessRequest.filter({ email });
        if (existing2?.length > 0) {
          await svc.entities.DemoAccessRequest.update(existing2[0].id, { invite_sent: false });
        }
      } catch { /* ignore */ }
    }

    return Response.json({ ok: true, token, emailSent, emailError });
  } catch (error) {
    console.error('invite-demo-access error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}