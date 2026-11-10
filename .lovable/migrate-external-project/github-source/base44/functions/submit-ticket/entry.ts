import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';
import {
  generateTicketNumber,
  getMatchingSlaPolicy,
  computeSlaDeadlines,
  parseDeviceInfo,
  roleLabel,
} from '../../shared/ticketHelpers.ts';

// Creates a support ticket + first message, sends auto-acknowledge email and
// in-app notification, and computes SLA deadlines.
// Called from the app via base44.functions.invoke('submit-ticket', { ... }).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      category,
      subject,
      description,
      urgency = 'P3',
      screenshot_uri,
      kb_article,
      context: clientContext = {},
    } = body;

    if (!subject || !description) {
      return Response.json({ error: 'Subject and description are required' }, { status: 400 });
    }

    // Knowledge Base article the user was reading when they asked for help
    const kbSlug = kb_article?.slug ? String(kb_article.slug).slice(0, 100) : '';
    const fullDescription = kbSlug
      ? `${description}\n\nRelated help article: ${String(kb_article.title || kbSlug).slice(0, 200)} (/help/article/${kbSlug})`
      : description;

    const db = base44.asServiceRole.entities;
    const clubId = user.data?.club_id || user.club_id || '';
    if (!clubId) {
      return Response.json({ error: 'No club context found for this user' }, { status: 400 });
    }

    // Load club info for denormalized display
    const club = await db.Club.get(clubId).catch(() => null);
    const clubName = club?.name || '';

    // Generate unique ticket number (retry on collision)
    let ticketNumber = await generateTicketNumber(db, clubId);
    let existing = await db.Ticket.filter({ ticket_number: ticketNumber }, null, 1);
    if (existing.length > 0) {
      const count = await db.Ticket.count({ club_id: clubId }).catch(() => 0);
      ticketNumber = `TKT-${String(count + 2).padStart(5, '0')}`;
    }

    // Find matching SLA policy
    const planTier = club?.subscription_plan || 'default';
    const slaPolicy = await getMatchingSlaPolicy(db, clubId, planTier);
    const now = new Date();
    const slaDeadlines = computeSlaDeadlines(slaPolicy, urgency, now);

    // Parse device info from the User-Agent header
    const userAgent = req.headers.get('user-agent') || '';
    const deviceInfo = {
      ...parseDeviceInfo(userAgent),
      user_agent: userAgent.substring(0, 500),
      language: clientContext.language || '',
      screen: clientContext.screen || '',
    };

    // Create the ticket
    const ticket = await db.Ticket.create({
      club_id: clubId,
      club_name: clubName,
      ticket_number: ticketNumber,
      category: category || 'other',
      subject,
      description: fullDescription,
      urgency,
      priority: urgency,
      status: 'new',
      submitted_by_name: user.full_name || user.email,
      submitted_by_email: user.email,
      submitted_by_role: roleLabel(user),
      submitted_by_user_id: user.id,
      branch_id: clientContext.branch_id || user.data?.branch_id || '',
      branch_name: clientContext.branch_name || user.data?.branch_name || '',
      current_page: clientContext.current_page || '',
      app_version: clientContext.app_version || '',
      device_info: deviceInfo,
      client_errors: clientContext.client_errors || [],
      screenshot_uri: screenshot_uri || '',
      tags: kbSlug ? [`kb:${kbSlug}`] : [],
      sla_policy_id: slaPolicy.id || '',
      sla_response_deadline: slaDeadlines.sla_response_deadline,
      sla_resolution_deadline: slaDeadlines.sla_resolution_deadline,
      sla_total_paused_seconds: 0,
      sla_75_alerted: false,
      sla_breach_alerted: false,
      last_message_at: now.toISOString(),
      message_count: 1,
    });

    // Create the first message (the customer's initial description)
    await db.TicketMessage.create({
      club_id: clubId,
      ticket_id: ticket.id,
      ticket_number: ticketNumber,
      author_name: user.full_name || user.email,
      author_email: user.email,
      author_role: roleLabel(user),
      author_type: 'customer',
      is_internal: false,
      body: fullDescription,
      message_type: 'message',
      attachments: screenshot_uri ? [screenshot_uri] : [],
    });

    // Send auto-acknowledge email
    const ackSubject = `[${ticketNumber}] We received your support request: ${subject}`;
    const ackBody = `Hi ${user.full_name || 'there'},\n\nWe've received your support request and our team is on it.\n\nTicket: ${ticketNumber}\nSubject: ${subject}\nPriority: ${urgency}\nCategory: ${category || 'other'}\n\nYou can view your ticket and reply anytime from the "My Tickets" page in the app. We'll notify you by email when there's an update.\n\nThank you for reaching out.`;
    await sendBrandedEmail(base44, {
      to: user.email,
      subject: ackSubject,
      body: ackBody,
    }).catch((e) => console.error('Ticket ack email failed:', e));

    // Create in-app notification
    await db.Notification.create({
      club_id: clubId,
      user_email: user.email,
      type: 'announcement',
      delivery: 'push',
      title: `Support ticket ${ticketNumber} created`,
      message: `We received your request: ${subject}. Our team will get back to you shortly.`,
      link: '/MyTickets',
    }).catch(() => {});

    // Notify system support agents (find users with system_role = system_support or system_owner)
    // We create a notification for the system channel — agents see it in the console
    await db.Notification.create({
      club_id: '',
      user_email: 'system-support',
      type: 'announcement',
      delivery: 'push',
      title: `New ticket: ${ticketNumber} from ${clubName}`,
      message: `${subject} (${urgency}) — ${category || 'other'}`,
      link: `/SupportConsole?ticket=${ticket.id}`,
    }).catch(() => {});

    return Response.json({ ticket: { id: ticket.id, ticket_number: ticketNumber, status: 'new' } });
  } catch (error) {
    console.error('submit-ticket error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}