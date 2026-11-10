// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';

// Notifies registered families when a tryout session is changed or cancelled.
// Called from the app (admin action) via base44.functions.invoke.
// body: { event_id, type: 'changed' | 'cancelled', changes?: { date?, time?, location? } }
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const { event_id, type, changes } = await req.json();
    if (!event_id) return Response.json({ error: 'Missing event_id' }, { status: 400 });
    const event = await db.TryoutEvent.get(event_id).catch(() => null);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
    const plan = event.tryout_plan_id ? await db.TryoutPlan.get(event.tryout_plan_id).catch(() => null) : null;
    const regs = await db.TryoutRegistration.filter(
      { tryout_event_id: event_id, status: { $in: ['registered', 'waitlist'] } },
      null, 1000,
    );
    if (!regs.length) return Response.json({ notified: 0 });

    const label = plan?.title || 'Tryout';
    const oldDate = event.date;
    const oldTime = event.start_time || '';
    const oldLoc = event.location || '';

    let subject: string;
    let body: string;
    if (type === 'cancelled') {
      subject = `${label} on ${oldDate} — session cancelled`;
      body = `Your tryout session on ${oldDate}${oldTime ? ` at ${oldTime}` : ''}${oldLoc ? ` at ${oldLoc}` : ''} has been cancelled. The club will follow up with rescheduling details. You don't need to do anything right now.`;
    } else {
      const c = changes || {};
      const parts: string[] = [];
      if (c.date) parts.push(`Date: ${c.date}`);
      if (c.time) parts.push(`Time: ${c.time}`);
      if (c.location) parts.push(`Location: ${c.location}`);
      const changeStr = parts.length ? parts.join(' · ') : 'check the updated schedule';
      subject = `${label} — session details changed`;
      body = `Your tryout session details have changed.\n\nNew details: ${changeStr}\n\nIf you can no longer make it, you can cancel from your registration link.`;
    }

    let sent = 0;
    for (const r of regs) {
      if (!r.guardian_email) continue;
      await db.Notification.create({
        club_id: event.club_id, user_email: r.guardian_email, type: 'announcement', delivery: 'push',
        title: subject, message: body,
      }).catch(() => {});
      await sendBrandedEmail(base44, { to: r.guardian_email, subject, body }).catch(() => {});
      sent++;
    }
    return Response.json({ notified: sent });
  } catch (error) {
    console.error('tryoutNotify error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}