// @ts-nocheck
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { secrets } from '@/legacy-functions/_runtime';
import { generateOccurrencesAndSessions } from '../../shared/recurrence.ts';

// Nightly rolling 90-day extension for all published recurring events.
// Invoked by the "Extend Occurrences" scheduled workflow (daily at 3am).
// Also reachable via external cron with X-CRON-TOKEN header (optional).
//
// For every Event whose status is "published" and event_type is "recurring"
// or "multi_date", re-expands its RecurrenceRule up to 90 days out. Because
// generateOccurrencesAndSessions is idempotent, this just fills in any new
// dates that have entered the window.
export default async function (req: Request): Promise<Response> {
  try {
    // Optional external-cron auth: if a CRON_SECRET is set and the caller
    // sends X-CRON-TOKEN, it must match. When there's no secret configured,
    // the endpoint is callable without a token (the scheduled workflow
    // calls it internally with no token).
    const cronSecret = secrets.get('CRON_SECRET');
    if (cronSecret) {
      const token = req.headers.get('X-CRON-TOKEN');
      if (token !== cronSecret) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const events = await svc.entities.Event.filter({ status: 'published' }, '-created_date', 500).catch(() => []);
    const cap = new Date();
    cap.setDate(cap.getDate() + 90);

    const summary = { events_processed: 0, occurrences_created: 0, sessions_created: 0, errors: [] };
    for (const event of (events || [])) {
      if (event.event_type !== 'recurring' && event.event_type !== 'multi_date') continue;
      const rules = await svc.entities.RecurrenceRule.filter({ event_id: event.id }, '-created_date', 50).catch(() => []);
      for (const rule of (rules || [])) {
        try {
          const res = await generateOccurrencesAndSessions(svc, event, rule, cap);
          summary.occurrences_created += res.occurrencesCreated;
          summary.sessions_created += res.sessionsCreated;
        } catch (e) {
          summary.errors.push({ event_id: event.id, error: e.message });
        }
      }
      summary.events_processed++;
    }

    return Response.json(summary);
  } catch (error) {
    console.error('extend-occurrences error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}