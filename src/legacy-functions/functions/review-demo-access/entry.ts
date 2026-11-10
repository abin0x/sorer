// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';

// Admin-only: approves or denies a pending demo access request.
// On approval, generates a unique access token and sends an invite email
// with a link to /demo?token=xxx.

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { requestId, action } = body; // action: "approve" | "deny"

    if (!requestId || !action) {
      return Response.json({ error: 'requestId and action are required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = base44.asServiceRole;
    const request = await svc.entities.DemoAccessRequest.get(requestId);
    if (!request) return Response.json({ error: 'Request not found' }, { status: 404 });

    if (action === 'deny') {
      await svc.entities.DemoAccessRequest.update(requestId, {
        status: 'denied',
        reviewed_by: user.email,
        reviewed_date: new Date().toISOString(),
      });
      return Response.json({ ok: true, status: 'denied' });
    }

    // Approve — generate token and send email
    const token = crypto.randomUUID();

    // Build the demo link — always use the custom public domain
    const demoLink = `https://www.clubrudder.com/demo?token=${token}`;

    const nowIso = new Date().toISOString();
    await svc.entities.DemoAccessRequest.update(requestId, {
      status: 'invited',
      access_token: token,
      reviewed_by: user.email,
      reviewed_date: nowIso,
      invite_sent: true,
      invite_sent_date: nowIso,
    });

    // Send approval email
    let emailSent = false;
    let emailError = null;
    try {
      await sendBrandedEmail(base44, {
        to: request.email,
        subject: 'Your ClubRudder demo access is ready',
        body: `<div style="color:#334155;font-size:15px;line-height:1.7;">
          <p>Hi ${request.name || 'there'},</p>
          <p>Great news — your request for demo access to ClubRudder has been approved!</p>
          <p>You can now launch the interactive demo and walk through the full club setup experience:</p>
          <p style="margin:24px 0;">
            <a href="${demoLink}" style="display:inline-block;background:#4f46e5;color:#fff;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;">Launch Interactive Demo</a>
          </p>
          <p>The demo will guide you through creating your club, adding branches, selecting platforms, and rolling over your first season — all with real data saved to your trial account.</p>
          <p>If you have any questions, just reply to this email.</p>
          <p>— The ClubRudder Team</p>
        </div>`,
      });
      emailSent = true;
    } catch (emailErr) {
      emailError = emailErr.message || String(emailErr);
      console.error('Failed to send approval email:', emailErr);
      try {
        await svc.entities.DemoAccessRequest.update(requestId, { invite_sent: false });
      } catch { /* ignore */ }
    }

    return Response.json({ ok: true, status: 'approved', token, emailSent, emailError });
  } catch (error) {
    console.error('review-demo-access error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}