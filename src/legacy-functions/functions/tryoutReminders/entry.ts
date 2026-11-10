// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';
import { expireStaleOffers } from '../../shared/tryoutOffers.ts';

// Daily: remind registered families the day before a tryout session, and alert admins about upcoming sessions with no field or no coach.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;
    const appUrl = (req.headers.get('X-Base44-App-Url') || process.env.WIX_CHECKOUT_APP_URL || '').replace(/\/$/, '');
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const events = await db.TryoutEvent.filter({ date: tomorrow }, null, 500);
    let sent = 0;

    for (const ev of events) {
      const regs = await db.TryoutRegistration.filter({ tryout_event_id: ev.id }, null, 1000);
      const title = `Tryout tomorrow: ${ev.date}${ev.start_time ? ` at ${ev.start_time}` : ''}`;
      for (const r of regs.filter((x: any) => x.status === 'registered' && x.guardian_email)) {
        const prior = await db.Notification.filter({ user_email: r.guardian_email, title }, null, 1).catch(() => []);
        if (prior.length) continue;
        const message = `${r.player_name} is registered${ev.location ? ` at ${ev.location}` : ''}. Bring your check-in code: ${r.check_in_code || ''}.`;
        await db.Notification.create({ club_id: ev.club_id, user_email: r.guardian_email, type: 'announcement', delivery: 'push', title, message }).catch(() => {});
        await sendBrandedEmail(base44, { to: r.guardian_email, subject: title, body: message }).catch(() => {});
        sent++;
      }
    }
    // Roster offers past their deadline lapse here, and the next player in the
    // waitlist order is moved up and offered the spot.
    const sweep = await expireStaleOffers(db, base44, { appUrl }).catch((e: any) => {
      console.error('offer expiry sweep failed:', e?.message || e);
      return { expired: 0 };
    });

    return Response.json({ events: events.length, reminders: sent, offers_expired: sweep?.expired || 0 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}