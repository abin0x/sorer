// @ts-nocheck
// beacon-deliver — fans a Beacon post out to its channel audience.
//
// mode "send": called by the author right after posting. Creates in-app
//   notifications per person's settings; Urgent posts also go out by email
//   (Resend) and text (Twilio, when the club has it connected).
// mode "escalate": staff follow-up on an Urgent/"Got it" post, re-sending by
//   text and email only to the people who haven't seen or acknowledged it.
//
// The caller's own access rules load the message first, so nobody can trigger
// delivery for a post they cannot see. People and settings are then read with
// the service client because recipients' settings are private to them.

import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { Resend } from '@/legacy-functions/_resend';
import { planDelivery, urgencyOf, pendingRecipients } from '@/lib/beaconDelivery';
import { resolveChannelAudienceEmails } from '@/lib/beaconChannels';

const STAFF = ["master_admin", "admin", "club_director", "club_admin", "branch_director", "branch_admin", "coach", "team_manager"];
const rows = (r) => (Array.isArray(r) ? r : r?.items || []);
const norm = (e) => String(e || '').trim().toLowerCase();

async function sendSms(to, body) {
  const lovable = process.env.LOVABLE_API_KEY;
  const twilio = process.env.TWILIO_API_KEY;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!lovable || !twilio || !from) return { ok: false, reason: 'not_configured' };
  const res = await fetch('https://connector-gateway.lovable.dev/twilio/Messages.json', {
    method: 'POST',
    headers: { Authorization: `Bearer ${lovable}`, 'X-Connection-Api-Key': twilio, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: to, From: from, Body: body.slice(0, 600) }),
  });
  if (!res.ok) { console.error(`Twilio send failed [${res.status}]: ${await res.text()}`); return { ok: false, reason: `error_${res.status}` }; }
  return { ok: true };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { message_id, mode = 'send' } = await req.json().catch(() => ({}));
    if (typeof message_id !== 'string' || !message_id) return Response.json({ error: 'message_id required' }, { status: 400 });

    // Caller-scoped read: fails if the caller can't see this post.
    const message = await base44.entities.ChannelMessage.get(message_id).catch(() => null);
    if (!message) return Response.json({ error: 'Message not found' }, { status: 404 });
    const role = user.custom_role || user.role;
    const isAuthor = message.author_user_id === user.id || norm(message.author_email) === norm(user.email);
    if (mode === 'send' && !isAuthor) return Response.json({ error: 'Only the author can send this post' }, { status: 403 });
    if (mode === 'escalate' && !STAFF.includes(role)) return Response.json({ error: 'Only staff can follow up' }, { status: 403 });
    if (mode === 'send' && message.escalation_summary?.sent_at) return Response.json({ ok: true, already: true });

    const svc = base44.asServiceRole;
    const channel = await svc.entities.Channel.get(message.channel_id);
    if (!channel || channel.club_id !== message.club_id) return Response.json({ error: 'Channel not found' }, { status: 404 });
    const clubId = message.club_id;
    const [coaches, guardians, players, prefRows] = await Promise.all([
      svc.entities.Coach.filter({ club_id: clubId }, 'last_name', 500).then(rows),
      svc.entities.Guardian.filter({ club_id: clubId }, '-created_date', 2000).then(rows),
      channel.scope === 'team' ? svc.entities.Player.filter({ club_id: clubId, team_id: channel.team_id }, '-created_date', 500).then(rows) : Promise.resolve([]),
      svc.entities.NotificationPreference.filter({ club_id: clubId }, '-created_date', 5000).then(rows),
    ]);
    const audience = resolveChannelAudienceEmails(channel, { coaches, guardians, players });
    const phoneByEmail = new Map([...guardians, ...coaches].filter((p) => p.email).map((p) => [norm(p.email), p.phone || p.mobile_phone || null]));
    const prefByEmail = new Map(prefRows.map((p) => [norm(p.user_email), p]));
    const urgency = urgencyOf(message);
    const esc = (v) => String(v || '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]);
    const text = `${channel.name}: ${(message.content || 'New post').slice(0, 300)}`;
    const link = 'https://clubrudder.com/CommunicationPortal';

    const targets = mode === 'escalate' ? pendingRecipients(message, audience) : audience.filter((e) => norm(e) !== norm(message.author_email));
    const notifications = [];
    const emails = [];
    const sms = [];
    for (const email of targets) {
      const prefs = prefByEmail.get(norm(email)) || null;
      const phone = prefs?.sms_phone || phoneByEmail.get(norm(email));
      const plan = mode === 'escalate'
        ? { notify: 'push', email: prefs?.email_urgent !== false, sms: prefs?.sms_urgent !== false && !!phone }
        : planDelivery({ urgency, prefs, channelId: channel.id, teamId: channel.team_id, phone });
      if (plan.notify) notifications.push({
        club_id: clubId, user_email: email, type: 'beacon_message', delivery: plan.notify,
        is_priority: urgency !== 'info', channel_id: channel.id, channel_name: channel.name,
        title: urgency === 'urgent' ? `URGENT · ${channel.name}` : urgency === 'important' ? `Important · ${channel.name}` : channel.name,
        message: (message.content || 'New post').slice(0, 140), link: '/CommunicationPortal', read: false,
      });
      if (plan.email) emails.push(email);
      if (plan.sms && phone) sms.push(phone);
    }

    if (notifications.length) await svc.entities.Notification.bulkCreate(notifications);

    let emailSent = 0;
    if (emails.length && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      for (let i = 0; i < emails.length; i += 50) {
        const r = await resend.emails.send({
          from: 'Club Rudder Beacon <welcome@clubrudder.com>', to: ['welcome@clubrudder.com'], bcc: emails.slice(i, i + 50),
          subject: `${mode === 'escalate' ? 'Reminder — ' : ''}Urgent: ${String(channel.name || '').replace(/[\r\n<>]/g, ' ').slice(0, 120)}`,
          html: `<p><strong>${esc(channel.name)}</strong></p><p>${esc(message.content)}</p><p><a href="${link}">Open Beacon</a></p>`,
        });
        if (r?.error) console.error('Beacon email failed', r.error); else emailSent += emails.slice(i, i + 50).length;
      }
    }

    let smsSent = 0; let smsStatus = sms.length ? 'sent' : 'none';
    for (const to of [...new Set(sms)]) {
      const r = await sendSms(to, `${mode === 'escalate' ? 'Reminder: ' : ''}${text} — ${link}`);
      if (r.ok) smsSent++; else { smsStatus = r.reason; if (r.reason === 'not_configured') break; }
    }

    const summary = {
      ...(message.escalation_summary || {}),
      [mode === 'escalate' ? 'last_followup' : 'initial']: { at: new Date().toISOString(), audience: targets.length, notified: notifications.length, emailed: emailSent, texted: smsSent, sms_status: smsStatus },
      ...(mode === 'send' ? { sent_at: new Date().toISOString() } : {}),
    };
    await svc.entities.ChannelMessage.update(message.id, { escalation_summary: summary, ...(mode === 'escalate' ? { escalated_at: new Date().toISOString() } : {}) });
    return Response.json({ ok: true, urgency, audience: targets.length, notified: notifications.length, emailed: emailSent, texted: smsSent, sms_status: smsStatus });
  } catch (error) {
    console.error('beacon-deliver error:', error);
    return Response.json({ error: error.message || 'Delivery failed' }, { status: 500 });
  }
}
