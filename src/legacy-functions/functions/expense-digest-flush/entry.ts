// @ts-nocheck
// Flushed every 15 min by the "Expense Digest Flush" workflow.
// Collects digest-mode expense notifications older than the batch window,
// groups them by recipient, sends ONE batched email per recipient, and marks
// them digest_sent so they're never re-flushed.
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';
import { getExpenseSettings } from '../../shared/notificationDelivery.ts';

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    // Service-role only — this runs from a scheduled workflow with no user.
    // Auth is via the CRON_SECRET passed by the workflow runner (already validated by platform).

    const body = await req.json().catch(() => ({}));
    const clubId = body.club_id; // optional — if blank, process all clubs

    // Fetch all unsent digest notifications for expense_approval.
    const filter: any = { type: 'expense_approval', delivery: 'digest', digest_sent: false };
    if (clubId) filter.club_id = clubId;
    const pending = await base44.asServiceRole.entities.Notification.filter(filter, 'created_date', 200).catch(() => []);

    if (pending.length === 0) return Response.json({ flushed: 0 });

    // Group by recipient email.
    const byUser: Record<string, any[]> = {};
    for (const n of pending) {
      const key = n.user_email || '(unknown)';
      (byUser[key] ||= []).push(n);
    }

    let flushed = 0;
    for (const [email, notes] of Object.entries(byUser)) {
      const clubIdForGroup = notes[0]?.club_id;
      const settings = await getExpenseSettings(base44, clubIdForGroup);
      const windowMin = settings?.batch_window_minutes || 15;
      // Only flush notes older than the batch window so near-simultaneous
      // submissions get batched together.
      const cutoff = Date.now() - windowMin * 60 * 1000;
      const ready = notes.filter((n) => new Date(n.created_date).getTime() < cutoff);
      if (ready.length === 0) continue;

      const lines = ready.map((n) => `• ${n.title} — ${n.message}`);
      const subject = ready.length === 1
        ? ready[0].title
        : `${ready.length} expense reports need your attention`;
      const body = `You have ${ready.length === 1 ? 'an expense update' : `${ready.length} expense updates`} waiting:\n\n${lines.join('\n\n')}\n\nReview them in the Expense Approvals page.`;

      await sendBrandedEmail(base44, {
        to: email,
        subject,
        body,
        from_name: settings?.from_name || undefined,
      }).catch((e: any) => console.error('digest flush email failed', e));

      // Mark each flushed notification as sent.
      const ids = ready.map((n) => n.id);
      await base44.asServiceRole.entities.Notification.updateMany(
        { id: { $in: ids } },
        { $set: { digest_sent: true } }
      ).catch((e: any) => console.error('digest_sent mark failed', e));
      flushed += ready.length;
    }

    return Response.json({ flushed, recipients: Object.keys(byUser).length });
  } catch (error) {
    console.error('expense-digest-flush error:', error);
    return Response.json({ error: error.message || 'Flush failed' }, { status: 500 });
  }
}