// Runs weekly (and optionally monthly) via the "Expense Weekly Digest" workflow.
// Summarizes expense activity for the period and emails a digest to each
// bookkeeper/admin of every club with activity.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';
import { getApproverUsers, getExpenseSettings } from '../../shared/notificationDelivery.ts';

function money(n: number) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const mode = body.mode || 'weekly'; // 'weekly' | 'monthly'
    const clubId = body.club_id;

    const days = mode === 'monthly' ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Gather all clubs with reports in the window.
    const reportFilter: any = {};
    if (clubId) reportFilter.club_id = clubId;
    const allReports = await base44.asServiceRole.entities.ExpenseReport.filter(reportFilter, '-created_date', 500).catch(() => []);

    // Group by club.
    const byClub: Record<string, any[]> = {};
    for (const r of allReports) {
      if (new Date(r.created_date) < new Date(since)) continue;
      (byClub[r.club_id] ||= []).push(r);
    }

    let sent = 0;
    for (const [cid, reports] of Object.entries(byClub)) {
      const settings = await getExpenseSettings(base44, cid);
      const enabled = mode === 'monthly' ? settings?.monthly_digest_enabled : settings?.weekly_digest_enabled;
      if (enabled === false) continue;

      const submitted = reports.filter((r) => ['submitted', 'in_review'].includes(r.status));
      const approved = reports.filter((r) => ['approved', 'exported_to_quickbooks', 'paid'].includes(r.status));
      const paid = reports.filter((r) => r.status === 'paid');
      const submittedTotal = submitted.reduce((s, r) => s + (r.submitted_total || 0), 0);
      const approvedTotal = approved.reduce((s, r) => s + (r.approved_total || 0), 0);
      const paidTotal = paid.reduce((s, r) => s + (r.approved_total || 0), 0);

      if (reports.length === 0) continue;

      const periodLabel = mode === 'monthly' ? 'monthly' : 'weekly';
      const subject = `${mode === 'monthly' ? 'Monthly' : 'Weekly'} expense summary`;
      const bodyText = [
        `Here's your ${periodLabel} expense activity summary:`,
        ``,
        `Reports submitted: ${submitted.length} (${money(submittedTotal)})`,
        `Reports approved: ${approved.length} (${money(approvedTotal)})`,
        `Reports paid: ${paid.length} (${money(paidTotal)})`,
        ``,
        reports.slice(0, 10).map((r) => `• ${r.title} — ${r.submitter_name} — ${money(r.submitted_total || r.approved_total)} — ${r.status}`).join('\n'),
        reports.length > 10 ? `\n...and ${reports.length - 10} more.` : '',
      ].join('\n');

      const recipients = await getApproverUsers(base44, cid);
      for (const r of recipients) {
        await sendBrandedEmail(base44, {
          to: r.email,
          subject,
          body: bodyText,
          from_name: settings?.from_name || undefined,
        }).catch((e: any) => console.error('weekly digest email failed', e));
        sent++;
      }
    }

    return Response.json({ mode, clubs: Object.keys(byClub).length, sent });
  } catch (error) {
    console.error('expense-weekly-digest error:', error);
    return Response.json({ error: error.message || 'Digest failed' }, { status: 500 });
  }
}