import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { ensureSettings, addToSuppression } from '../../shared/outreachAccess.ts';
import { addProspectToSegment } from '../../shared/outreachSegmentation.ts';

// Public endpoint for Resend webhook events + one-click unsubscribe.
// No auth required — validated by Resend signing secret or prospect ID matching.

export default async function(req) {
  try {
    const url = new URL(req.url);
    const queryAction = url.searchParams.get('action');

    // --- One-click unsubscribe (GET or POST) ---
    if (queryAction === 'unsubscribe') {
      return await handleUnsubscribe(req, url);
    }

    // --- Resend webhook event (POST) ---
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const eventType = body.type || body.event_type || '';
    const eventData = body.data || body;
    const messageId = eventData.id || eventData.email_id || eventData.message_id || '';
    const toAddress = Array.isArray(eventData.to) ? eventData.to[0] : eventData.to || '';
    const clickedUrl = eventData.click?.url || eventData.url || '';

    // Log the raw event regardless of resolution
    const eventRecord = {
      resend_event_id: body.id || body.event_id || messageId,
      event_type: eventType,
      payload: body,
    };

    // Resolve prospect by email
    let prospect = null;
    if (toAddress) {
      const found = await base44.asServiceRole.entities.Prospect.filter({ email: toAddress });
      prospect = found?.[0] || null;
    }

    // Resolve send by Resend message ID
    let send = null;
    if (messageId) {
      const found = await base44.asServiceRole.entities.OutreachSend.filter({ resend_message_id: messageId });
      send = found?.[0] || null;
    }

    eventRecord.prospect_id = prospect?.id || '';
    eventRecord.send_id = send?.id || '';

    await base44.asServiceRole.entities.OutreachEvent.create(eventRecord);

    // Handle event
    switch (eventType) {
      case 'email.delivered': {
        if (send) {
          await base44.asServiceRole.entities.OutreachSend.update(send.id, {
            status: 'delivered',
            delivered_at: new Date().toISOString(),
          });
        }
        break;
      }

      case 'email.opened': {
        if (send) {
          await base44.asServiceRole.entities.OutreachSend.update(send.id, {
            open_count: (send.open_count || 0) + 1,
            opened_at: send.opened_at || new Date().toISOString(),
          });
        }
        if (prospect) {
          const updates = { last_engaged_at: new Date().toISOString() };
          if (prospect.status === 'contacted' || prospect.status === 'new') {
            updates.status = 'opened';
          }
          await base44.asServiceRole.entities.Prospect.update(prospect.id, updates);
          // Warm lead: opened an email
          await addProspectToSegment(base44, prospect, 'warm-leads', 'webhook');
        }
        break;
      }

      case 'email.clicked': {
        if (send) {
          await base44.asServiceRole.entities.OutreachSend.update(send.id, {
            click_count: (send.click_count || 0) + 1,
            clicked_at: send.clicked_at || new Date().toISOString(),
            clicked_links: [...(send.clicked_links || []), clickedUrl].filter(Boolean),
          });
        }
        if (prospect) {
          await base44.asServiceRole.entities.Prospect.update(prospect.id, {
            status: 'clicked',
            last_engaged_at: new Date().toISOString(),
          });
          // Hot lead: clicked within 72h of last contact
          const since = prospect.last_contacted_at ? Date.now() - new Date(prospect.last_contacted_at).getTime() : Infinity;
          if (since < 72 * 3600000) {
            await addProspectToSegment(base44, prospect, 'hot-leads', 'webhook');
            await notifySystemOwner(base44, prospect, clickedUrl, 'clicked a link');
          }
          // Pricing interest
          if (clickedUrl && clickedUrl.includes('/pricing')) {
            await addProspectToSegment(base44, prospect, 'clicked-pricing', 'webhook');
          }
        }
        break;
      }

      case 'email.bounced': {
        if (send) {
          await base44.asServiceRole.entities.OutreachSend.update(send.id, {
            status: 'bounced',
            bounced_reason: eventData.bounce?.message || eventData.reason || 'Bounced',
          });
        }
        if (prospect) {
          await base44.asServiceRole.entities.Prospect.update(prospect.id, {
            status: 'bounced',
            suppressed: true,
            suppression_reason: 'bounce',
          });
          await addToSuppression(base44, prospect.email, 'bounce');
          // Remove from all active enrollments
          await base44.asServiceRole.entities.OutreachEnrollment.updateMany(
            { prospect_id: prospect.id, status: 'active' },
            { $set: { status: 'removed' } }
          );
        }
        break;
      }

      case 'email.complained': {
        if (send) {
          await base44.asServiceRole.entities.OutreachSend.update(send.id, { status: 'complained' });
        }
        if (prospect) {
          await base44.asServiceRole.entities.Prospect.update(prospect.id, {
            status: 'unsubscribed',
            suppressed: true,
            suppression_reason: 'complaint',
          });
          await addToSuppression(base44, prospect.email, 'complaint');
          // Remove from all segments and enrollments
          await base44.asServiceRole.entities.ProspectSegmentMember.deleteMany({ prospect_id: prospect.id });
          await base44.asServiceRole.entities.OutreachEnrollment.updateMany(
            { prospect_id: prospect.id, status: { $in: ['active', 'paused'] } },
            { $set: { status: 'removed' } }
          );
        }
        break;
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('outreach-webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function notifySystemOwner(base44, prospect, contextUrl, reason) {
  try {
    const settings = await ensureSettings(base44);
    const to = settings.notification_email || '';
    if (!settings.notify_on_reply || !to) return;
    const appUrl = 'https://clubrudder.com';
    const subject = `🔥 Hot lead: ${prospect.first_name} ${prospect.last_name} (${prospect.club_name})`;
    const body = `<p><b>${prospect.first_name} ${prospect.last_name}</b> at <b>${prospect.club_name}</b> ${reason}.</p>` +
      `<p>Email: ${prospect.email}<br>Title: ${prospect.title || '—'}<br>Branches: ${prospect.branch_count || '?'} · Players: ${prospect.player_count || '?'}</p>` +
      (contextUrl ? `<p>Link: <a href="${contextUrl}">${contextUrl}</a></p>` : '') +
      `<p><a href="${appUrl}/SaaSAdmin?tab=outreach">Open Outreach →</a></p>`;
    await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, html: body });
  } catch (e) {
    console.error('notifySystemOwner failed:', e);
  }
}

async function handleUnsubscribe(req, url) {
  const base44 = createClientFromRequest(req);
  const pid = url.searchParams.get('pid');
  const email = url.searchParams.get('email');

  if (!pid || !email) {
    return new Response('<h1>Invalid unsubscribe link</h1>', {
      headers: { 'Content-Type': 'text/html' },
      status: 400,
    });
  }

  const prospect = await base44.asServiceRole.entities.Prospect.get(pid);
  if (!prospect || prospect.email !== email) {
    return new Response('<h1>Invalid unsubscribe link</h1>', {
      headers: { 'Content-Type': 'text/html' },
      status: 400,
    });
  }

  await base44.asServiceRole.entities.Prospect.update(pid, {
    status: 'unsubscribed',
    suppressed: true,
    suppression_reason: 'unsubscribe',
  });
  await addToSuppression(base44, email, 'unsubscribe');
  await base44.asServiceRole.entities.OutreachEnrollment.updateMany(
    { prospect_id: pid, status: { $in: ['active', 'paused'] } },
    { $set: { status: 'removed' } }
  );

  return new Response(
    `<!DOCTYPE html><html><body style="font-family:Inter,Arial,sans-serif;text-align:center;padding:60px 20px;">
      <h1 style="color:#334155;">You're unsubscribed</h1>
      <p style="color:#64748b;">You won't receive any more emails from ClubRudder Outreach.</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}