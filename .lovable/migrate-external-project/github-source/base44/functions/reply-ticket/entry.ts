import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';
import { isSystemAgent, roleLabel } from '../../shared/ticketHelpers.ts';

// Adds a reply to a ticket thread. Agent replies notify the submitter by email
// and in-app. Customer replies reopen resolved tickets and notify agents.
// Called from the app via base44.functions.invoke('reply-ticket', { ... }).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { ticket_id, body: messageBody, is_internal, attachments, status_change, resolution_notes } = body;
    if (!ticket_id || !messageBody) {
      return Response.json({ error: 'ticket_id and body are required' }, { status: 400 });
    }

    const db = base44.asServiceRole.entities;
    const ticket = await db.Ticket.get(ticket_id).catch(() => null);
    if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404 });

    const agent = isSystemAgent(user);
    const now = new Date().toISOString();

    // Determine new status
    let newStatus = ticket.status;
    if (status_change) {
      newStatus = status_change;
    } else if (!agent && ticket.status === 'resolved') {
      // Customer reply reopens a resolved ticket
      newStatus = 'open';
    } else if (agent && ticket.status === 'new') {
      // Agent first reply moves from new to open
      newStatus = 'open';
    }

    // Create the message
    const message = await db.TicketMessage.create({
      club_id: ticket.club_id,
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      author_name: user.full_name || user.email,
      author_email: user.email,
      author_role: roleLabel(user),
      author_type: agent ? 'agent' : 'customer',
      is_internal: is_internal || false,
      body: messageBody,
      message_type: is_internal ? 'internal_note' : 'message',
      attachments: attachments || [],
    });

    // Update ticket
    const updates: Record<string, any> = {
      last_message_at: now,
      message_count: (ticket.message_count || 1) + 1,
      status: newStatus,
    };

    // Handle SLA pause/resume
    if (newStatus === 'pending_customer' && ticket.status !== 'pending_customer') {
      updates.sla_paused_at = now;
    } else if (newStatus !== 'pending_customer' && ticket.status === 'pending_customer' && ticket.sla_paused_at) {
      // Resume SLA — add paused duration to total
      const pausedMs = Date.now() - new Date(ticket.sla_paused_at).getTime();
      updates.sla_total_paused_seconds = (ticket.sla_total_paused_seconds || 0) + Math.floor(pausedMs / 1000);
      updates.sla_paused_at = '';
    }

    // Handle resolution
    if (newStatus === 'resolved' && ticket.status !== 'resolved') {
      updates.resolved_by = user.email;
      updates.resolved_date = now;
      if (resolution_notes) updates.resolution_notes = resolution_notes;
    }

    // Handle closure
    if (newStatus === 'closed' && ticket.status !== 'closed') {
      updates.closed_date = now;
    }

    await db.Ticket.update(ticket.id, updates);

    // Create a status-change system message if status actually changed
    if (newStatus !== ticket.status) {
      await db.TicketMessage.create({
        club_id: ticket.club_id,
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        author_name: user.full_name || user.email,
        author_email: user.email,
        author_role: roleLabel(user),
        author_type: agent ? 'agent' : 'system',
        is_internal: false,
        body: `Status changed from ${ticket.status} to ${newStatus}`,
        message_type: 'status_change',
        metadata: { old_status: ticket.status, new_status: newStatus },
      }).catch(() => {});
    }

    // Notifications
    if (agent && !is_internal) {
      // Agent reply → notify submitter by email + in-app
      const emailSubject = `[${ticket.ticket_number}] Update on your support request`;
      const emailBody = `Hi ${ticket.submitted_by_name || 'there'},\n\nThere's an update on your support ticket:\n\n${messageBody}\n\nYou can reply from the "My Tickets" page in the app, or just reply to this email.\n\nTicket: ${ticket.ticket_number}\nSubject: ${ticket.subject}`;
      await sendBrandedEmail(base44, {
        to: ticket.submitted_by_email,
        subject: emailSubject,
        body: emailBody,
      }).catch((e) => console.error('Ticket reply email failed:', e));

      await db.Notification.create({
        club_id: ticket.club_id,
        user_email: ticket.submitted_by_email,
        type: 'announcement',
        delivery: 'push',
        title: `Update on ticket ${ticket.ticket_number}`,
        message: messageBody.substring(0, 200),
        link: '/MyTickets',
      }).catch(() => {});
    } else if (!agent) {
      // Customer reply → notify assigned agent (if any) in-app
      if (ticket.assigned_to_id) {
        // Find the agent's email — we stored it on the ticket
        await db.Notification.create({
          club_id: '',
          user_email: 'system-support',
          type: 'announcement',
          delivery: 'push',
          title: `Reply on ticket ${ticket.ticket_number}`,
          message: `${user.full_name} replied: ${messageBody.substring(0, 150)}`,
          link: `/SupportConsole?ticket=${ticket.id}`,
        }).catch(() => {});
      }
    }

    return Response.json({ message: { id: message.id }, status: newStatus });
  } catch (error) {
    console.error('reply-ticket error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}