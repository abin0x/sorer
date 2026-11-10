import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { ensureSettings, isSuppressed, getTodaySendLimit } from '../../shared/outreachAccess.ts';
import { createResendService } from '../../shared/resendService.ts';
import { renderTemplate, addComplianceFooter, buildUnsubscribeUrl } from '../../shared/templateRenderer.ts';

// Sequence engine — runs on a scheduler (every 15 min via workflow).
// Finds active sequences with pending steps, evaluates conditions, sends due emails.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: this is a scheduled job, verify admin/system_owner
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (e) { /* scheduled — may not have user token */ }

    // If invoked by a user, verify system_owner. If scheduled (no user), allow via service role.
    if (user) {
      const isOwner = user.system_role === 'system_owner' || user.is_super_admin === true;
      if (!isOwner) return Response.json({ error: 'Not Found' }, { status: 404 });
    }

    const settings = await ensureSettings(base44);
    const apiKey = settings.resend_api_key || secrets.get('RESEND_API_KEY');
    if (!apiKey) return Response.json({ error: 'No Resend API key configured' }, { status: 400 });

    // Check daily send limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { items: todaySends } = await base44.asServiceRole.entities.OutreachSend.filter(
      { sent_at: { $gte: todayStart.toISOString() }, status: { $in: ['sent', 'delivered'] } },
      { limit: 1000 }
    );
    const todayLimit = getTodaySendLimit(settings);
    const sendsRemaining = Math.max(0, todayLimit - (todaySends?.length || 0));
    if (sendsRemaining === 0) {
      return Response.json({ message: 'Daily send limit reached', sent: 0 });
    }

    // Get all active sequences
    const { items: activeSequences } = await base44.asServiceRole.entities.OutreachSequence.filter(
      { status: 'active' }, { limit: 100 }
    );

    let totalSent = 0;
    let totalSkipped = 0;
    const errors = [];

    for (const seq of activeSequences) {
      if (sendsRemaining <= 0) break;

      // Get steps ordered
      const { items: steps } = await base44.asServiceRole.entities.OutreachSequenceStep.filter(
        { sequence_id: seq.id }, { sort: 'step_order', limit: 50 }
      );
      if (!steps.length) continue;

      // Get active enrollments due for sending
      const now = new Date().toISOString();
      const { items: enrollments } = await base44.asServiceRole.entities.OutreachEnrollment.filter(
        { sequence_id: seq.id, status: 'active', next_send_at: { $lte: now } },
        { limit: 200 }
      );

      for (const enrollment of enrollments) {
        if (sendsRemaining <= 0) break;

        const nextStepOrder = enrollment.current_step_order + 1;
        const step = steps.find(s => s.step_order === nextStepOrder);
        if (!step) {
          // Sequence complete
          await base44.asServiceRole.entities.OutreachEnrollment.update(enrollment.id, {
            status: 'completed',
            completed_at: new Date().toISOString(),
            next_send_at: '',
          });
          continue;
        }

        const prospect = await base44.asServiceRole.entities.Prospect.get(enrollment.prospect_id);
        if (!prospect) { totalSkipped++; continue; }

        // Never send to suppressed/bounced/unsubscribed
        if (prospect.suppressed || prospect.needs_review || prospect.status === 'unsubscribed' || prospect.status === 'bounced') {
          await base44.asServiceRole.entities.OutreachEnrollment.update(enrollment.id, { status: 'removed' });
          totalSkipped++;
          continue;
        }
        if (isSuppressed(prospect.email, settings)) {
          await base44.asServiceRole.entities.OutreachEnrollment.update(enrollment.id, { status: 'removed' });
          totalSkipped++;
          continue;
        }

        // Evaluate condition
        if (!evaluateCondition(step.condition, prospect, enrollment, base44)) {
          // Skip this step, advance to next
          await base44.asServiceRole.entities.OutreachEnrollment.update(enrollment.id, {
            current_step_order: nextStepOrder,
            last_step_sent_at: new Date().toISOString(),
            next_send_at: new Date(Date.now() + (step.delay_days * 86400000)).toISOString(),
          });
          totalSkipped++;
          continue;
        }

        // Build template
        let template;
        if (step.template_id) {
          const tplRes = await base44.asServiceRole.entities.OutreachTemplate.filter({ id: step.template_id });
          template = tplRes?.[0];
        }
        if (!template) {
          template = {
            subject: step.subject_template,
            body_html: step.body_template,
            variables: [],
          };
        }

        // Render
        let rendered;
        try {
          rendered = renderTemplate(template, prospect);
        } catch (e) {
          errors.push({ prospect: prospect.email, error: e.message });
          totalSkipped++;
          continue;
        }

        const appUrl = req.headers.get('X-Base44-App-Url') || 'https://clubrudder.com';
        const unsubscribeUrl = buildUnsubscribeUrl(appUrl, prospect);
        const html = addComplianceFooter(rendered.html, settings, unsubscribeUrl);
        const from = `${settings.from_name || 'ClubRudder Team'} <${settings.from_address || 'team@mail.clubrudder.com'}>`;

        // Send
        try {
          const service = createResendService(apiKey);
          const result = await service.sendEmail({
            to: prospect.email,
            from,
            subject: rendered.subject,
            html,
            replyTo: settings.reply_to_address,
            tags: [
              { name: 'sequence', value: seq.name },
              { name: 'step', value: String(step.step_order) },
            ],
          });
          const messageId = result?.data?.id || '';

          // Log send
          await base44.asServiceRole.entities.OutreachSend.create({
            prospect_id: prospect.id,
            prospect_email: prospect.email,
            sequence_id: seq.id,
            sequence_name: seq.name,
            step_id: step.id,
            resend_message_id: messageId,
            from_address: from,
            to_address: prospect.email,
            subject: rendered.subject,
            body_html: html,
            status: 'sent',
            sent_at: new Date().toISOString(),
            is_one_off: false,
          });

          // Update prospect
          await base44.asServiceRole.entities.Prospect.update(prospect.id, {
            status: prospect.status === 'new' ? 'contacted' : prospect.status,
            last_contacted_at: new Date().toISOString(),
          });

          // Advance enrollment
          const nextDelay = steps.find(s => s.step_order === nextStepOrder + 1)?.delay_days || 1;
          await base44.asServiceRole.entities.OutreachEnrollment.update(enrollment.id, {
            current_step_order: nextStepOrder,
            last_step_sent_at: new Date().toISOString(),
            next_send_at: new Date(Date.now() + (nextDelay * 86400000)).toISOString(),
          });

          totalSent++;
        } catch (e) {
          errors.push({ prospect: prospect.email, error: e.message });
          totalSkipped++;
        }
      }
    }

    return Response.json({
      sent: totalSent,
      skipped: totalSkipped,
      errors: errors.slice(0, 20),
      limit_remaining: sendsRemaining,
    });
  } catch (error) {
    console.error('outreach-engine error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function evaluateCondition(condition, prospect, enrollment, base44) {
  if (!condition || condition === 'always') return true;
  // Conditions are evaluated against the prospect's engagement with the PREVIOUS step
  // We check the last send's open/click status
  // This is synchronous — we rely on the prospect's current status as a proxy
  switch (condition) {
    case 'if_not_opened':
      // Send if prospect hasn't opened (status is still 'contacted' or 'new')
      return prospect.status === 'contacted' || prospect.status === 'new';
    case 'if_not_clicked':
      // Send if prospect hasn't clicked
      return prospect.status !== 'clicked' && prospect.status !== 'replied' && prospect.status !== 'booked';
    case 'if_opened_not_clicked':
      // Send only if they opened but didn't click
      return prospect.status === 'opened';
    default:
      return true;
  }
}