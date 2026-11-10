import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireSystemOwner, logAudit, ensureSettings } from '../../shared/outreachAccess.ts';
import { addProspectToSegment } from '../../shared/outreachSegmentation.ts';

// Classifies an inbound reply with AI, updates the prospect, routes hot replies to the System Owner.
// Replies reach this function either from the UI ("Log reply") or a future inbound forwarder.

const INTENTS = ['interested', 'question', 'not_interested', 'ooo', 'other'];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { action, ...params } = await req.json();
    const db = base44.asServiceRole.entities;

    if (action === 'classify') {
      const { user, error } = await requireSystemOwner(base44);
      if (error) return error;

      // Resolve prospect
      let prospect = null;
      if (params.prospect_id) prospect = await db.Prospect.get(params.prospect_id);
      else if (params.email) {
        const found = await db.Prospect.filter({ email: String(params.email).trim().toLowerCase() }, { limit: 1 });
        prospect = found?.items?.[0] || null;
      }
      if (!prospect) return Response.json({ error: 'Prospect not found' }, { status: 404 });

      const body = String(params.body || '').trim();
      if (!body) return Response.json({ error: 'Reply body is required' }, { status: 400 });

      // Classify with AI
      const prompt = `You are classifying an email reply to a cold outreach campaign selling ClubRudder, a club-management SaaS platform.
Classify the reply into exactly one intent:
- interested: wants a demo, a call, more info, or asks a buying question
- question: asks a clarifying question but no buying intent yet
- not_interested: declines, not for us, stop contacting
- ooo: out of office / auto-responder
- other: anything else

Reply in JSON: { "intent": "<one of interested|question|not_interested|ooo|other>", "summary": "<one short sentence>" }

Sender: ${prospect.first_name} ${prospect.last_name} (${prospect.club_name})
Reply text:
"""
${body.slice(0, 4000)}
"""`;

      let intent = 'other';
      let summary = '';
      try {
        const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              intent: { type: 'string', enum: INTENTS },
              summary: { type: 'string' },
            },
            required: ['intent', 'summary'],
          },
        });
        intent = INTENTS.includes(res.intent) ? res.intent : 'other';
        summary = String(res.summary || '').slice(0, 280);
      } catch (e) {
        console.error('reply classification LLM failed:', e);
      }

      // Update prospect
      const statusMap = { interested: 'replied', question: 'replied', not_interested: 'not_interested', ooo: 'contacted', other: 'replied' };
      await db.Prospect.update(prospect.id, {
        status: statusMap[intent],
        last_engaged_at: new Date().toISOString(),
        notes: summary || `Reply classified: ${intent}`,
      });

      // Pause active enrollments (a human should take over)
      await db.OutreachEnrollment.updateMany(
        { prospect_id: prospect.id, status: 'active' },
        { $set: { status: 'paused' } }
      );

      // Route by intent
      const settings = await ensureSettings(base44);
      if (intent === 'interested') {
        await addProspectToSegment(base44, prospect, 'replied-interested', 'webhook');
        await addProspectToSegment(base44, prospect, 'hot-leads', 'webhook');
        await notifyOwner(base44, settings, prospect, summary, 'replied — interested');
      } else if (intent === 'question') {
        await addProspectToSegment(base44, prospect, 'replied-question', 'webhook');
        await notifyOwner(base44, settings, prospect, summary, 'replied — has a question');
      } else if (intent === 'not_interested') {
        await db.Prospect.update(prospect.id, { suppressed: true, suppression_reason: 'not_interested' });
        await db.OutreachEnrollment.updateMany(
          { prospect_id: prospect.id, status: 'paused' },
          { $set: { status: 'removed' } }
        );
      }

      await logAudit(base44, user, 'prospect.reply_classified', 'Prospect', prospect.id, { intent, summary });
      return Response.json({ intent, summary, prospect_id: prospect.id });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (error) {
    console.error('outreach-reply error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function notifyOwner(base44, settings, prospect, summary, reason) {
  try {
    const to = settings.notification_email || '';
    if (!to) return;
    const subject = `🔥 ${prospect.first_name} ${prospect.last_name} (${prospect.club_name}) ${reason}`;
    const body = `<p><b>${prospect.first_name} ${prospect.last_name}</b> at <b>${prospect.club_name}</b> ${reason}.</p>` +
      `<p>${summary || ''}</p><p>Email: ${prospect.email}</p>` +
      `<p><a href="https://clubrudder.com/SaaSAdmin?tab=outreach">Open Outreach →</a></p>`;
    await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, html: body });
  } catch (e) {
    console.error('reply notifyOwner failed:', e);
  }
}