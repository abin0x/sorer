import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { generateOccurrencesAndSessions } from '../../shared/recurrence.ts';

// Expands a RecurrenceRule into EventOccurrence + Session + GroupSession rows.
// Invoked by the "Expand Recurrence" entity workflow whenever a RecurrenceRule
// is created or updated. Runs as the service role (workflow context, no user).
//
// Payload: { rule_id }
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const ruleId = body?.rule_id;
    if (!ruleId) return Response.json({ error: 'rule_id is required' }, { status: 400 });

    const rule = await svc.entities.RecurrenceRule.get(ruleId).catch(() => null);
    if (!rule) return Response.json({ error: 'RecurrenceRule not found' }, { status: 404 });

    const event = await svc.entities.Event.get(rule.event_id).catch(() => null);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

    // Expand up to 90 days out (rolling window). The nightly "Extend Occurrences"
    // workflow keeps extending this window so recurring events never stop generating.
    const cap = new Date();
    cap.setDate(cap.getDate() + 90);
    const result = await generateOccurrencesAndSessions(svc, event, rule, cap);

    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error('expand-recurrence error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}