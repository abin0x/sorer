// @ts-nocheck
// Runs daily via the "Expense Reminders" workflow.
// Finds reports stuck in submitted/in_review, sends reminder notifications to
// approvers after reminder_days, and escalates to the club director after
// escalation_days. Tracks sent reminders via existing Notification records
// (title prefix) to avoid duplicate sends.
import { createClientFromRequest } from '@/legacy-functions/_sdk';
import { sendBrandedEmail } from '../../shared/resendEmail.ts';
import {
  getApproverUsers,
  getExpenseSettings,
  getNotificationPrefs,
  resolveExpenseDelivery,
} from '../../shared/notificationDelivery.ts';

function money(n: number) {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

function ageDays(dateStr: string) {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

async function alreadySent(base44: any, reportId: string, prefix: string) {
  const rows = await base44.asServiceRole.entities.Notification.filter({
    expense_id: reportId,
  }).catch(() => []);
  return rows.some((n: any) => (n.title || '').startsWith(prefix));
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const clubId = body.club_id;

    const filter: any = { status: { $in: ['submitted', 'in_review'] } };
    if (clubId) filter.club_id = clubId;
    const reports = await base44.asServiceRole.entities.ExpenseReport.filter(filter).catch(() => []);

    let reminders = 0;
    let escalations = 0;

    for (const report of reports) {
      const settings = await getExpenseSettings(base44, report.club_id);
      const reminderDays = settings?.reminder_days ?? 3;
      const escalationDays = settings?.escalation_days ?? 7;
      const age = ageDays(report.submitted_date || report.created_date);

      const appUrl = req.headers.get('X-Base44-App-Url') || '';
      const approverLink = `${appUrl}/ExpenseApprovals`;

      // Reminder to approvers.
      if (age >= reminderDays && !await alreadySent(base44, report.id, 'Reminder:')) {
        const approvers = await getApproverUsers(base44, report.club_id);
        for (const approver of approvers) {
          if (approver.id === report.submitter_id) continue;
          const prefs = await getNotificationPrefs(base44, approver.id);
          const delivery = resolveExpenseDelivery(prefs, {});
          await base44.asServiceRole.entities.Notification.create({
            club_id: report.club_id,
            user_email: approver.email,
            type: 'expense_approval',
            delivery,
            expense_id: report.id,
            title: `Reminder: ${report.title} awaits review`,
            message: `${report.submitter_name}'s report (${money(report.submitted_total)}) has been waiting ${age} days. Please review it.`,
            link: approverLink,
          }).catch(() => {});
          if (delivery === 'push') {
            await sendBrandedEmail(base44, {
              to: approver.email,
              subject: `Reminder: ${report.title} awaits review`,
              body: `${report.submitter_name}'s report (${money(report.submitted_total)}) has been waiting ${age} days. Please review it.`,
              from_name: settings?.from_name || undefined,
            }).catch(() => {});
          }
        }
        reminders++;
      }

      // Escalation to club director.
      if (age >= escalationDays && !await alreadySent(base44, report.id, 'Escalation:')) {
        const directors = (await getApproverUsers(base44, report.club_id))
          .filter((u: any) => ['club_director', 'club_admin', 'master_admin', 'admin'].includes(u.custom_role) || u.role === 'admin');
        for (const director of directors) {
          await sendBrandedEmail(base44, {
            to: director.email,
            subject: `Escalation: ${report.title} unresolved for ${age} days`,
            body: `An expense report from ${report.submitter_name} (${money(report.submitted_total)}) has been awaiting review for ${age} days. Please ensure it gets processed.`,
            from_name: settings?.from_name || undefined,
          }).catch(() => {});
          await base44.asServiceRole.entities.Notification.create({
            club_id: report.club_id,
            user_email: director.email,
            type: 'expense_approval',
            delivery: 'push',
            expense_id: report.id,
            title: `Escalation: ${report.title} unresolved for ${age} days`,
            message: `An expense report from ${report.submitter_name} (${money(report.submitted_total)}) has been awaiting review for ${age} days.`,
            link: approverLink,
          }).catch(() => {});
        }
        escalations++;
      }
    }

    return Response.json({ checked: reports.length, reminders, escalations });
  } catch (error) {
    console.error('expense-reminders error:', error);
    return Response.json({ error: error.message || 'Reminders failed' }, { status: 500 });
  }
}