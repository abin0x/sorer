// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';
import { computeSlaProgress } from '../../shared/ticketHelpers.ts';

// Scheduled function: checks SLA timers on all active tickets.
// Alerts the system owner at 75% of resolution SLA and on breach.
// Paused (pending_customer) tickets are skipped.
// Called by the "Ticket SLA Monitor" workflow on an hourly schedule.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // Auth check — this is an admin/scheduled function
    const user = await base44.auth.me().catch(() => null);
    if (!user || (user.role !== 'admin' && user.system_role !== 'system_owner' && user.system_role !== 'system_admin')) {
      // Also allow CRON_SECRET for scheduled calls
      const authHeader = req.headers.get('authorization') || '';
      const cronSecret = Deno.env.get('CRON_SECRET');
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const db = base44.asServiceRole.entities;
    const now = new Date();
    const alerts: any[] = [];

    // Get all active (non-closed/resolved) tickets with SLA deadlines
    const tickets = await db.Ticket.filter({
      status: { $in: ['new', 'open', 'escalated', 'pending_customer'] },
      sla_resolution_deadline: { $exists: true },
    }, { sort: '-created_date', limit: 500 }).catch(() => ({ items: [] }));

    const items = (tickets as any).items || tickets || [];
    for (const ticket of items) {
      // Skip paused tickets
      if (ticket.status === 'pending_customer' && ticket.sla_paused_at) continue;

      const progress = computeSlaProgress(ticket, now);
      const updates: Record<string, any> = {};

      // 75% alert
      if (progress.pct >= 75 && progress.pct < 100 && !ticket.sla_75_alerted) {
        updates.sla_75_alerted = true;
        alerts.push({ ticket_id: ticket.id, ticket_number: ticket.ticket_number, type: '75%', pct: Math.round(progress.pct) });

        await db.Notification.create({
          club_id: '',
          user_email: 'system-support',
          type: 'announcement',
          delivery: 'push',
          title: `SLA 75% warning: ${ticket.ticket_number}`,
          message: `Ticket ${ticket.ticket_number} (${ticket.club_name}) is at ${Math.round(progress.pct)}% of resolution SLA. Subject: ${ticket.subject}`,
          link: `/SupportConsole?ticket=${ticket.id}`,
        }).catch(() => {});
      }

      // Breach alert
      if (progress.breached && !ticket.sla_breach_alerted) {
        updates.sla_breach_alerted = true;
        alerts.push({ ticket_id: ticket.id, ticket_number: ticket.ticket_number, type: 'breach', pct: 100 });

        await db.Notification.create({
          club_id: '',
          user_email: 'system-support',
          type: 'announcement',
          delivery: 'push',
          title: `SLA BREACH: ${ticket.ticket_number}`,
          message: `Ticket ${ticket.ticket_number} (${ticket.club_name}) has breached its resolution SLA. Subject: ${ticket.subject}`,
          link: `/SupportConsole?ticket=${ticket.id}`,
        }).catch(() => {});

        // Email the system owner
        await sendBrandedEmail(base44, {
          to: 'support@clubrudder.com',
          subject: `SLA BREACH: ${ticket.ticket_number}`,
          body: `Ticket ${ticket.ticket_number} from ${ticket.club_name} has breached its resolution SLA.\n\nSubject: ${ticket.subject}\nPriority: ${ticket.priority}\nCreated: ${ticket.created_date}\n\nView in the Support Console.`,
        }).catch((e) => console.error('SLA breach email failed:', e));
      }

      if (Object.keys(updates).length > 0) {
        await db.Ticket.update(ticket.id, updates).catch(() => {});
      }
    }

    return Response.json({ checked: items.length, alerts });
  } catch (error) {
    console.error('ticket-sla-check error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}