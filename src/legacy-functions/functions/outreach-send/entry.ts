// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { secrets } from '@/legacy-functions/_runtime';
import { requireSystemOwner, logAudit, ensureSettings, isSuppressed } from '../../shared/outreachAccess.ts';
import { createResendService } from '../../shared/resendService.ts';
import { renderTemplate, addComplianceFooter, buildUnsubscribeUrl } from '../../shared/templateRenderer.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, ...params } = body;

    const { user, error } = await requireSystemOwner(base44);
    if (error) return error;

    switch (action) {
      case 'one_off': {
        const settings = await ensureSettings(base44);
        const apiKey = settings.resend_api_key || secrets.get('RESEND_API_KEY');
        if (!apiKey) return Response.json({ error: 'No Resend API key configured' }, { status: 400 });

        const prospect = await base44.asServiceRole.entities.Prospect.get(params.prospect_id);
        if (!prospect) return Response.json({ error: 'Prospect not found' }, { status: 404 });

        if (prospect.needs_review) {
          return Response.json({ error: 'Email needs review before it can be sent to' }, { status: 400 });
        }
        // Never send to suppressed prospects
        if (prospect.suppressed || prospect.status === 'unsubscribed' || prospect.status === 'bounced') {
          return Response.json({ error: 'Prospect is suppressed — cannot send' }, { status: 400 });
        }
        if (isSuppressed(prospect.email, settings)) {
          return Response.json({ error: 'Email is on the global suppression list' }, { status: 400 });
        }

        // Build template (from template_id or inline)
        let template;
        if (params.template_id) {
          template = await base44.entities.OutreachTemplate.get(params.template_id);
          if (!template) return Response.json({ error: 'Template not found' }, { status: 404 });
        } else {
          template = { subject: params.subject, body_html: params.body_html, variables: [] };
        }

        // Render
        let rendered;
        try {
          rendered = renderTemplate(template, prospect);
        } catch (e) {
          return Response.json({ error: 'Template render failed: ' + e.message }, { status: 400 });
        }

        const appUrl = req.headers.get('X-Base44-App-Url') || 'https://clubrudder.com';
        const unsubscribeUrl = buildUnsubscribeUrl(appUrl, prospect);
        const html = addComplianceFooter(rendered.html, settings, unsubscribeUrl);
        const from = `${settings.from_name || 'ClubRudder Team'} <${settings.from_address || 'team@mail.clubrudder.com'}>`;

        const service = createResendService(apiKey);
        const result = await service.sendEmail({
          to: prospect.email,
          from,
          subject: rendered.subject,
          html,
          replyTo: settings.reply_to_address,
          tags: [{ name: 'type', value: 'one_off' }],
        });

        const messageId = result?.data?.id || '';

        // Log to OutreachSend
        const send = await base44.asServiceRole.entities.OutreachSend.create({
          prospect_id: prospect.id,
          prospect_email: prospect.email,
          sequence_id: '',
          sequence_name: '',
          step_id: '',
          resend_message_id: messageId,
          from_address: from,
          to_address: prospect.email,
          subject: rendered.subject,
          body_html: html,
          status: 'sent',
          sent_at: new Date().toISOString(),
          is_one_off: true,
        });

        // Update prospect
        await base44.asServiceRole.entities.Prospect.update(prospect.id, {
          status: prospect.status === 'new' ? 'contacted' : prospect.status,
          last_contacted_at: new Date().toISOString(),
        });

        await logAudit(base44, user, 'send.one_off', 'OutreachSend', send.id, { prospect_id: prospect.id });
        return Response.json({ success: true, messageId, send_id: send.id });
      }

      default:
        return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
    }
  } catch (error) {
    console.error('outreach-send error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}