import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { Resend } from 'npm:resend@3.2.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { recipients, subject, html, text, from_name } = body;

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
        from: `${from_name || 'Club Rudder OS'} <welcome@clubrudder.com>`,
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
    console.error('Bulk email error:', error);
    return Response.json({ 
      error: error.message || 'Failed to send bulk emails' 
    }, { status: 500 });
  }
});