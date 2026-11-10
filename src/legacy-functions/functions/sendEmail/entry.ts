// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';
import { assertClubRecipients, sanitizeEmailHtml } from '../../shared/emailGuard.ts';

export default (async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const STAFF = ['master_admin', 'admin', 'club_director', 'club_admin', 'branch_director', 'branch_admin', 'coach', 'team_manager', 'bookkeeper'];
    if (!STAFF.includes(user.custom_role || user.role) && !user.is_super_admin) {
      return Response.json({ error: 'Only club staff can send email from the app' }, { status: 403 });
    }

    const body = await req.json();
    const { to, subject, html, text, body: bodyContent, from_name } = body;

    if (!to || !subject || (!html && !text && !bodyContent)) {
      return Response.json({
        error: 'Missing required fields: to, subject, and html or text'
      }, { status: 400 });
    }

    let recipients;
    try { recipients = await assertClubRecipients(req, to); }
    catch (e) { return Response.json({ error: e.message }, { status: e.status || 403 }); }

    const data = await sendBrandedEmail(base44, {
      to: recipients,
      subject,
      html: sanitizeEmailHtml(html) || undefined,
      text: text || undefined,
      body: sanitizeEmailHtml(bodyContent) || undefined,
      from_name: from_name ? String(from_name).replace(/[\r\n<>"]/g, ' ').slice(0, 80) : undefined,
    });

    return Response.json({
      success: true,
      messageId: data.id
    });

  } catch (error) {
    console.error('Email error:', error);
    return Response.json({
      error: error.message || 'Failed to send email'
    }, { status: 500 });
  }
});