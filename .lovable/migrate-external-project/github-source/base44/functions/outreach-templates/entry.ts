import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { requireSystemOwner, logAudit, ensureSettings, isSuppressed } from '../../shared/outreachAccess.ts';
import { createResendService } from '../../shared/resendService.ts';
import { renderTemplate, renderWithVariables, addComplianceFooter, buildUnsubscribeUrl } from '../../shared/templateRenderer.ts';

const STARTER_TEMPLATES = [
  {
    name: 'Directors — Touch 1',
    subject: '{{first_name}}, a better way to run {{club_name}}',
    body_html: `<div style="font-family:Inter,Arial,sans-serif;color:#334155;max-width:600px;margin:0 auto;">
  <p style="font-size:15px;line-height:1.7;">Hi {{first_name}},</p>
  <p style="font-size:15px;line-height:1.7;">I came across {{club_name}} and was impressed by what you've built${'{{branch_count}}' ? ' across {{branch_count}} branches' : ''}. Running a multi-location club is no small feat — tryout season alone is a logistical nightmare.</p>
  <p style="font-size:15px;line-height:1.7;">We built ClubRudder to help clubs like yours consolidate registration, scheduling, payments, and communication into one platform. Directors who switch typically save 10+ hours per week on admin work.</p>
  <p style="font-size:15px;line-height:1.7;">I'd love to show you a quick walkthrough. Would Tuesday or Thursday afternoon work for a 20-minute call?</p>
  <p style="font-size:15px;line-height:1.7;">Best,<br/>The ClubRudder Team</p>
</div>`,
    variables: ['first_name', 'club_name', 'branch_count'],
    preview_data: { first_name: 'Sarah', club_name: 'Michigan Jaguars', branch_count: '3' },
  },
  {
    name: 'Directors — Touch 2 (if not opened)',
    subject: 'Quick question about {{club_name}} tryouts',
    body_html: `<div style="font-family:Inter,Arial,sans-serif;color:#334155;max-width:600px;margin:0 auto;">
  <p style="font-size:15px;line-height:1.7;">Hi {{first_name}},</p>
  <p style="font-size:15px;line-height:1.7;">I know you're busy, so I'll keep this short. I reached out last week about helping {{club_name}} streamline operations.</p>
  <p style="font-size:15px;line-height:1.7;">Most directors we talk to tell us their biggest pain is tryout season — managing registrations across age groups, tracking who showed up, and communicating results to families. It's chaos.</p>
  <p style="font-size:15px;line-height:1.7;">ClubRudder automates the entire tryout-to-roster pipeline. Would you be open to a quick 15-minute demo this week?</p>
  <p style="font-size:15px;line-height:1.7;">Best,<br/>The ClubRudder Team</p>
</div>`,
    variables: ['first_name', 'club_name'],
    preview_data: { first_name: 'Sarah', club_name: 'Michigan Jaguars' },
  },
  {
    name: 'Directors — Touch 3 (opened, not clicked)',
    subject: 'How {{club_name}} could save 10 hours/week',
    body_html: `<div style="font-family:Inter,Arial,sans-serif;color:#334155;max-width:600px;margin:0 auto;">
  <p style="font-size:15px;line-height:1.7;">Hi {{first_name}},</p>
  <p style="font-size:15px;line-height:1.7;">Glad you've been reading — it tells me {{club_name}} is thinking seriously about operational efficiency.</p>
  <p style="font-size:15px;line-height:1.7;">Here's what a typical workflow looks like with ClubRudder:</p>
  <ul style="font-size:15px;line-height:1.7;color:#334155;">
    <li>Tryout registrations auto-flow into your roster — no spreadsheets</li>
    <li>Training schedules auto-generate from team preferences and field availability</li>
    <li>Parents get automated reminders; you stop answering "when is practice?" texts</li>
    <li>Dues and payments tracked in one ledger, synced to QuickBooks</li>
  </ul>
  <p style="font-size:15px;line-height:1.7;">I have a few slots open this week for a live walkthrough. <a href="https://clubrudder.com/demo" style="color:#4f46e5;">Book a demo here</a> and I'll set it up.</p>
  <p style="font-size:15px;line-height:1.7;">Best,<br/>The ClubRudder Team</p>
</div>`,
    variables: ['first_name', 'club_name'],
    preview_data: { first_name: 'Sarah', club_name: 'Michigan Jaguars' },
  },
  {
    name: 'Admins — Single Branch',
    subject: 'Simpler operations for {{club_name}}',
    body_html: `<div style="font-family:Inter,Arial,sans-serif;color:#334155;max-width:600px;margin:0 auto;">
  <p style="font-size:15px;line-height:1.7;">Hi {{first_name}},</p>
  <p style="font-size:15px;line-height:1.7;">Running a single-location club has its own challenges — you're wearing every hat from registration to scheduling to parent communication.</p>
  <p style="font-size:15px;line-height:1.7;">ClubRudder was built to give smaller clubs the same operational tools the big clubs use, without the enterprise price tag. Registration, payments, scheduling, and messaging — all in one place.</p>
  <p style="font-size:15px;line-height:1.7;">Would you be open to seeing how it works? I can do a quick 15-minute screen share anytime this week.</p>
  <p style="font-size:15px;line-height:1.7;">Best,<br/>The ClubRudder Team</p>
</div>`,
    variables: ['first_name', 'club_name'],
    preview_data: { first_name: 'Mike', club_name: 'Riverside SC' },
  },
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, ...params } = body;

    const { user, error } = await requireSystemOwner(base44);
    if (error) return error;

    switch (action) {
      case 'list': {
        const { items } = await base44.asServiceRole.entities.OutreachTemplate.filter(
          {}, { sort: '-created_date', limit: 200 }
        );
        return Response.json({ items });
      }

      case 'get': {
        const template = await base44.asServiceRole.entities.OutreachTemplate.get(params.id);
        return Response.json({ template });
      }

      case 'create': {
        const template = await base44.asServiceRole.entities.OutreachTemplate.create({
          name: params.name,
          subject: params.subject || '',
          body_html: params.body_html || '',
          preview_data: params.preview_data || {},
          variables: params.variables || [],
          created_by: user.id,
          created_by_name: user.full_name || user.email,
        });
        await logAudit(base44, user, 'template.create', 'OutreachTemplate', template.id);
        return Response.json({ template });
      }

      case 'update': {
        const updates = {};
        for (const f of ['name', 'subject', 'body_html', 'preview_data', 'variables']) {
          if (params[f] !== undefined) updates[f] = params[f];
        }
        const updated = await base44.asServiceRole.entities.OutreachTemplate.update(params.id, updates);
        await logAudit(base44, user, 'template.update', 'OutreachTemplate', params.id, { updates });
        return Response.json({ template: updated });
      }

      case 'delete': {
        await base44.asServiceRole.entities.OutreachTemplate.delete(params.id);
        await logAudit(base44, user, 'template.delete', 'OutreachTemplate', params.id);
        return Response.json({ success: true });
      }

      case 'seed': {
        const existing = await base44.asServiceRole.entities.OutreachTemplate.filter({}, { limit: 100 });
        const existingNames = new Set((existing.items || existing || []).map(t => t.name));
        const created = [];
        for (const t of STARTER_TEMPLATES) {
          if (!existingNames.has(t.name)) {
            const tpl = await base44.asServiceRole.entities.OutreachTemplate.create({
              ...t,
              created_by: user.id,
              created_by_name: user.full_name || user.email,
            });
            created.push(tpl);
          }
        }
        await logAudit(base44, user, 'template.seed', 'OutreachTemplate', null, { count: created.length });
        return Response.json({ created: created.length, templates: created });
      }

      case 'render': {
        const template = params.template_id
          ? await base44.asServiceRole.entities.OutreachTemplate.get(params.template_id)
          : { subject: params.subject, body_html: params.body_html, variables: params.variables || [] };
        if (!template) return Response.json({ error: 'Template not found' }, { status: 404 });
        try {
          const rendered = params.prospect_id
            ? renderTemplate(template, await base44.entities.Prospect.get(params.prospect_id))
            : renderWithVariables(template, params.variables || template.preview_data || {});
          return Response.json({ rendered });
        } catch (e) {
          return Response.json({ error: e.message }, { status: 400 });
        }
      }

      case 'test_send': {
        const settings = await ensureSettings(base44);
        const apiKey = settings.resend_api_key || secrets.get('RESEND_API_KEY');
        if (!apiKey) return Response.json({ error: 'No Resend API key configured' }, { status: 400 });
        const template = params.template_id
          ? await base44.asServiceRole.entities.OutreachTemplate.get(params.template_id)
          : { subject: params.subject, body_html: params.body_html, variables: params.variables || [] };
        if (!template) return Response.json({ error: 'Template not found' }, { status: 404 });
        try {
          const rendered = renderWithVariables(template, params.variables || template.preview_data || {});
          const appUrl = req.headers.get('X-Base44-App-Url') || 'https://clubrudder.com';
          const html = addComplianceFooter(rendered.html, settings, `${appUrl}/functions/outreach-webhook?action=unsubscribe&email=${encodeURIComponent(params.to)}`);
          const service = createResendService(apiKey);
          const from = `${settings.from_name || 'ClubRudder Team'} <${settings.from_address || 'team@mail.clubrudder.com'}>`;
          const result = await service.sendEmail({
            to: params.to,
            from,
            subject: rendered.subject,
            html,
            replyTo: settings.reply_to_address,
          });
          await logAudit(base44, user, 'template.test_send', 'OutreachTemplate', template.id || null, { to: params.to });
          return Response.json({ success: true, messageId: result?.data?.id });
        } catch (e) {
          return Response.json({ error: e.message }, { status: 400 });
        }
      }

      default:
        return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
    }
  } catch (error) {
    console.error('outreach-templates error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}