import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { to, subject, html, text, body: bodyContent, from_name } = body;

    if (!to || !subject || (!html && !text && !bodyContent)) {
      return Response.json({
        error: 'Missing required fields: to, subject, and html or text'
      }, { status: 400 });
    }

    const data = await sendBrandedEmail(base44, {
      to,
      subject,
      html: html || undefined,
      text: text || undefined,
      body: bodyContent || undefined,
      from_name,
    });

    return Response.json({
      success: true,
      messageId: data.id
    });

  } catch (error) {
    console.error('Email error:', error);
    return Response.json({
      error: error.message || 'Failed to send email'
    }, { status: 500 });
  }
});