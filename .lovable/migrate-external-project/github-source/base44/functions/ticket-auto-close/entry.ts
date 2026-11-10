import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Scheduled function: auto-closes tickets that have been idle.
// - Pending customer for 7 days → closed with a note.
// - Resolved for 5 days → closed.
// Called by the "Ticket Auto-Close" workflow on a daily schedule.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // Auth check — admin or CRON_SECRET
    const user = await base44.auth.me().catch(() => null);
    if (!user || (user.role !== 'admin' && user.system_role !== 'system_owner' && user.system_role !== 'system_admin')) {
      const authHeader = req.headers.get('authorization') || '';
      const cronSecret = Deno.env.get('CRON_SECRET');
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const db = base44.asServiceRole.entities;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400_000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 86400_000);

    let closedPending = 0;
    let closedResolved = 0;

    // 1. Pending customer for 7+ days → closed
    const pendingTickets = await db.Ticket.filter({
      status: 'pending_customer',
    }, { sort: '-created_date', limit: 500 }).catch(() => ({ items: [] }));

    const pendingItems = (pendingTickets as any).items || pendingTickets || [];
    for (const ticket of pendingItems) {
      // Check if the last message was 7+ days ago
      const lastMsg = ticket.last_message_at ? new Date(ticket.last_message_at) : new Date(ticket.created_date);
      if (lastMsg < sevenDaysAgo) {
        await db.Ticket.update(ticket.id, {
          status: 'closed',
          closed_date: now.toISOString(),
          auto_closed: true,
          auto_close_reason: 'pending_7d',
        }).catch(() => {});

        await db.TicketMessage.create({
          club_id: ticket.club_id,
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          author_name: 'System',
          author_email: 'system',
          author_role: 'system',
          author_type: 'system',
          is_internal: false,
          body: 'This ticket has been automatically closed after 7 days waiting for a customer response. If you still need help, please submit a new ticket.',
          message_type: 'auto_close',
          metadata: { reason: 'pending_7d' },
        }).catch(() => {});

        closedPending++;
      }
    }

    // 2. Resolved for 5+ days → closed
    const resolvedTickets = await db.Ticket.filter({
      status: 'resolved',
    }, { sort: '-created_date', limit: 500 }).catch(() => ({ items: [] }));

    const resolvedItems = (resolvedTickets as any).items || resolvedTickets || [];
    for (const ticket of resolvedItems) {
      const resolvedDate = ticket.resolved_date ? new Date(ticket.resolved_date) : new Date(ticket.created_date);
      if (resolvedDate < fiveDaysAgo) {
        await db.Ticket.update(ticket.id, {
          status: 'closed',
          closed_date: now.toISOString(),
          auto_closed: true,
          auto_close_reason: 'resolved_5d',
        }).catch(() => {});

        await db.TicketMessage.create({
          club_id: ticket.club_id,
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          author_name: 'System',
          author_email: 'system',
          author_role: 'system',
          author_type: 'system',
          is_internal: false,
          body: 'This ticket has been automatically closed 5 days after being marked resolved.',
          message_type: 'auto_close',
          metadata: { reason: 'resolved_5d' },
        }).catch(() => {});

        closedResolved++;
      }
    }

    return Response.json({ closed_pending: closedPending, closed_resolved: closedResolved });
  } catch (error) {
    console.error('ticket-auto-close error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}