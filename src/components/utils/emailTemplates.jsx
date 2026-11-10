import { base44 } from "@/api/base44Client";

// Helper function to log emails
async function logEmail({ recipientEmail, recipientName, subject, body, templateType, programId, taskId, expenseId, staffPayId, sentBy, status = 'success', errorMessage = null }) {
  try {
    await base44.entities.EmailLog.create({
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      subject,
      body,
      template_type: templateType,
      related_program_id: programId,
      related_task_id: taskId,
      related_expense_id: expenseId,
      related_staffpay_id: staffPayId,
      sent_by: sentBy,
      status,
      error_message: errorMessage
    });
  } catch (error) {
    console.error('Failed to log email:', error);
  }
}

// Program Assignment Email
export function formatProgramAssignmentEmail(program, assignee, assigner) {
  const subject = `New Program Assignment: ${program.title}`;
  const body = `Hi ${assignee.full_name || assignee.email},

${assigner.full_name || assigner.email} has assigned you to lead a new program:

Program: ${program.title}
Description: ${program.description || 'N/A'}
Status: ${program.status}
Priority: ${program.priority || 'N/A'}
Branch: ${program.branch || 'N/A'}
Season: ${program.season || 'N/A'}
Start Date: ${program.suggested_start_date || 'N/A'}
Due Date: ${program.due_date || 'N/A'}

Please review the program details and start planning your approach.

Best regards,
Jaguars Team Management`;

  return { subject, body };
}

// Task Assignment Email
export function formatTaskAssignmentEmail(task, program, assignee, assigner) {
  const subject = `New Task Assignment: ${task.title}`;
  const body = `Hi ${assignee.full_name || assignee.email},

${assigner.full_name || assigner.email} has assigned you a new task:

Task: ${task.title}
Description: ${task.description || 'N/A'}
Program: ${program.title}
Due Date: ${task.due_date || 'N/A'}
Status: ${task.completed ? 'Completed' : 'Pending'}

Please review the task and update your progress accordingly.

Best regards,
Jaguars Team Management`;

  return { subject, body };
}

// Expense Submission Email
export function formatExpenseSubmissionEmail(expense, program, submitter) {
  const subject = `New Expense Submitted: $${expense.amount} - ${program.title}`;
  const body = `A new expense has been submitted and requires approval:

Amount: $${expense.amount}
Submitted by: ${submitter.full_name || submitter.email}
Description: ${expense.description}
Program: ${program.title}
Category: ${expense.category || 'N/A'}
Date: ${expense.date || 'N/A'}

Please review and approve or reject this expense.

Best regards,
Jaguars Team Management`;

  return { subject, body };
}

// Expense Approval/Rejection Email
export function formatExpenseApprovalEmail(expense, program, payee, approver, isApproved) {
  const subject = `Expense ${isApproved ? 'Approved' : 'Rejected'}: $${expense.amount} - ${program.title}`;
  const body = `Hi ${payee.full_name || payee.email},

Your expense for ${program.title} has been ${isApproved ? 'approved' : 'rejected'}.

Amount: $${expense.amount}
Description: ${expense.description}
Category: ${expense.category || 'N/A'}
Date: ${expense.date || 'N/A'}
${isApproved ? 'Approved' : 'Rejected'} by: ${approver.full_name || approver.email}
${expense.approval_notes ? `Notes: ${expense.approval_notes}` : ''}

${isApproved ? 'The expense will be processed for payment.' : 'If you have questions, please contact your manager.'}

Best regards,
Jaguars Team Management`;

  return { subject, body };
}

// Staff Pay Email
export function formatStaffPayEmail(staffPay, program, payee, payor) {
  const subject = `Staff Payment Record: $${staffPay.amount} - ${program.title}`;
  const body = `Hi ${payee.full_name || payee.email},

A staff payment record has been created for you:

Amount: $${staffPay.amount}
Program: ${program.title}
Role: ${staffPay.role || 'N/A'}
Hours Worked: ${staffPay.hours_worked || 'N/A'}
Date: ${staffPay.date || 'N/A'}
Payment Status: ${staffPay.payment_status}
${staffPay.notes ? `Notes: ${staffPay.notes}` : ''}

Created by: ${payor.full_name || payor.email}

Best regards,
Jaguars Team Management`;

  return { subject, body };
}

// New Message Email
export function formatNewMessageEmail(message, program, sender) {
  const isAnnouncement = message.is_announcement;
  const subject = isAnnouncement 
    ? `New Announcement in ${program.title}`
    : `New Message in ${program.title}`;
  
  const body = `${isAnnouncement ? 'New Announcement' : 'New Message'} from ${sender.full_name || sender.email}:

Program: ${program.title}

${message.content}

${isAnnouncement ? 'This is an important announcement for all team members.' : 'Log in to view and respond to this message.'}

Best regards,
Jaguars Team Management`;

  return { subject, body };
}

// Send Email Function with Logging
export async function sendEmail({ to, subject, body, html, from_name, templateType, programId, taskId, expenseId, staffPayId, recipientName, sentBy }) {
  try {
    const response = await base44.functions.invoke('sendEmail', {
      to,
      subject,
      html: html || `<pre style="font-family: monospace; white-space: pre-wrap;">${body}</pre>`,
      text: body,
      from_name: from_name || "Jaguars Kanban"
    });

    // Log successful email
    await logEmail({
      recipientEmail: to,
      recipientName,
      subject,
      body,
      templateType: templateType || 'custom',
      programId,
      taskId,
      expenseId,
      staffPayId,
      sentBy,
      status: 'success'
    });

    return response;
  } catch (error) {
    // Log failed email
    await logEmail({
      recipientEmail: to,
      recipientName,
      subject,
      body,
      templateType: templateType || 'custom',
      programId,
      taskId,
      expenseId,
      staffPayId,
      sentBy,
      status: 'failed',
      errorMessage: error.message || 'Unknown error'
    });

    throw error;
  }
}

// Send Bulk Emails Function with Logging
export async function sendBulkEmails({ recipients, subject, body, html, from_name, templateType, programId, taskId, expenseId, staffPayId, sentBy }) {
  try {
    const response = await base44.functions.invoke('sendBulkEmails', {
      recipients,
      subject,
      html: html || `<pre style="font-family: monospace; white-space: pre-wrap;">${body}</pre>`,
      text: body,
      from_name: from_name || "Jaguars Kanban"
    });

    // Log emails for all recipients
    for (const recipient of recipients) {
      await logEmail({
        recipientEmail: recipient,
        recipientName: null,
        subject,
        body,
        templateType: templateType || 'custom',
        programId,
        taskId,
        expenseId,
        staffPayId,
        sentBy,
        status: 'success'
      });
    }

    return response;
  } catch (error) {
    // Log failed emails for all recipients
    for (const recipient of recipients) {
      await logEmail({
        recipientEmail: recipient,
        recipientName: null,
        subject,
        body,
        templateType: templateType || 'custom',
        programId,
        taskId,
        expenseId,
        staffPayId,
        sentBy,
        status: 'failed',
        errorMessage: error.message || 'Unknown error'
      });
    }

    throw error;
  }
}