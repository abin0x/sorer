// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { Resend } from '@/legacy-functions/_resend';
import { assertClubRecipients, sanitizeEmailHtml } from '../../shared/emailGuard.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

export default (async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subject, text, from_name } = body;
    const html = sanitizeEmailHtml(body.html);
    let recipients;
    try { recipients = await assertClubRecipients(req, body.recipients); }
    catch (e) { return Response.json({ error: e.message }, { status: e.status || 403 }); }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return Response.json({ 
        error: 'Recipients array is required and must not be empty' 
      }, { status: 400 });
    }

    if (!subject || (!html && !text)) {
      return Response.json({ 
        error: 'Missing required fields: subject, and html or text' 
      }, { status: 400 });
    }

    // Send emails concurrently to all recipients
    const emailPromises = recipients.map(recipient => 
      resend.emails.send({
        from: `${String(from_name || 'Club Rudder OS').replace(/[<>\r\n"]/g, '').slice(0, 80)} <welcome@clubrudder.com>`,
        to: [recipient],
        subject,
        html: html || undefined,
        text: text || undefined,
      })
    );

    const results = await Promise.allSettled(emailPromises);

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return Response.json({ 
      success: true,
      sent,
      failed,
      total: recipients.length,
      details: results.map((result, index) => ({
        recipient: recipients[index],
        status: result.status,
        messageId: result.status === 'fulfilled' ? result.value.data?.id : undefined,
        error: result.status === 'rejected' ? result.reason?.message : undefined
      }))
    });

  } catch (error) {
    console.error('Bulk email error:', error?.message);
    return Response.json({ 
      error: error.message || 'Failed to send bulk emails' 
    }, { status: 500 });
  }
});