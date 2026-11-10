// @ts-nocheck
// Sends the core expense-workflow notifications (per the engagement plan):
// submitted (submitter + approvers), returned, approved, rejected, paid.
// Respects each recipient's NotificationPreference (quiet hours, preset) and
// batches approver "submitted" notices into digest mode for the 15-min flush.
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';
import {
  getApproverUsers,
  getNotificationPrefs,
  getExpenseSettings,
  resolveExpenseDelivery,
} from '../../shared/notificationDelivery.ts';

function money(n: number) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { event, reportId } = body;
    if (!event || !reportId) {
      return Response.json({ error: 'Missing event or reportId' }, { status: 400 });
    }

    const report = await base44.asServiceRole.entities.ExpenseReport.get(reportId);
    if (!report) return Response.json({ error: 'Report not found' }, { status: 404 });

    const settings = await getExpenseSettings(base44, report.club_id);
    const appUrl = req.headers.get('X-Base44-App-Url') || '';
    const submitterLink = `${appUrl}/StaffExpenses`;
    const approverLink = `${appUrl}/ExpenseApprovals`;

    // Helper: create a notification + (for push) send email immediately.
    const deliver = async (recipient: any, opts: { type: string; title: string; message: string; link: string; forceDigest?: boolean }) => {
      if (!recipient?.email) return;
      const prefs = await getNotificationPrefs(base44, recipient.id);
      const delivery = resolveExpenseDelivery(prefs, { forceDigest: opts.forceDigest });
      await base44.asServiceRole.entities.Notification.create({
        club_id: report.club_id,
        user_email: recipient.email,
        type: opts.type,
        delivery,
        expense_id: reportId,
        title: opts.title,
        message: opts.message,
        link: opts.link,
      }).catch((e: any) => console.error('Notification.create failed', e));

      // Only push notifications are emailed immediately. Digest ones are
      // flushed by the Expense Digest Flush workflow (15-min batching).
      if (delivery === 'push') {
        await sendBrandedEmail(base44, {
          to: recipient.email,
          subject: opts.title,
          body: opts.message,
          from_name: settings?.from_name || undefined,
        }).catch((e: any) => console.error('sendBrandedEmail failed', e));
      }
    };

    const submitter = report.submitter_id
      ? await base44.asServiceRole.entities.User.get(report.submitter_id).catch(() => null)
      : null;
    const firstName = (submitter?.full_name || report.submitter_name || '').split(' ')[0] || 'there';

    if (event === 'submitted') {
      // Submitter confirmation — immediate (respects quiet hours).
      if (submitter) {
        await deliver(submitter, {
          type: 'expense_approval',
          title: `We received your expense report: ${report.title}`,
          message: `Hi ${firstName}, your report "${report.title}" totaling ${money(report.submitted_total)} was submitted for review. You'll hear from us when it's approved or if we need anything.`,
          link: submitterLink,
        });
      }
      // Approver notices — always digest (batched within 15 min).
      const approvers = await getApproverUsers(base44, report.club_id);
      for (const approver of approvers) {
        if (approver.id === report.submitter_id) continue; // no self-notify
        await deliver(approver, {
          type: 'expense_approval',
          title: `Expense report awaiting review: ${report.title}`,
          message: `${report.submitter_name} submitted a report totaling ${money(report.submitted_total)} for review.`,
          link: approverLink,
          forceDigest: true,
        });
      }
    } else if (event === 'returned' && submitter) {
      await deliver(submitter, {
        type: 'expense_approval',
        title: `Action needed: ${report.title}`,
        message: `Hi ${firstName}, ${report.reviewer_name || 'your reviewer'} returned your report: "${report.return_reason || 'See report for details'}". Update and resubmit when ready.`,
        link: submitterLink,
      });
    } else if (event === 'approved' && submitter) {
      await deliver(submitter, {
        type: 'expense_approval',
        title: `Approved: ${report.title}`,
        message: `Hi ${firstName}, your report was approved for ${money(report.approved_total)} (submitted: ${money(report.submitted_total)}). You'll get another message when payment is issued.`,
        link: submitterLink,
      });
    } else if (event === 'rejected' && submitter) {
      await deliver(submitter, {
        type: 'expense_approval',
        title: `Update on ${report.title}`,
        message: `Hi ${firstName}, your report was not approved. Reason: "${report.return_reason || 'See report for details'}".`,
        link: submitterLink,
      });
    } else if (event === 'paid' && submitter) {
      await deliver(submitter, {
        type: 'expense_approval',
        title: `Paid: ${report.title}`,
        message: `Hi ${firstName}, your reimbursement of ${money(report.approved_total)} was issued via ${report.payment_method || 'the club'}${report.payment_reference ? ` (ref ${report.payment_reference})` : ''}.`,
        link: submitterLink,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('expense-notify error:', error);
    return Response.json({ error: error.message || 'Failed to send notifications' }, { status: 500 });
  }
}