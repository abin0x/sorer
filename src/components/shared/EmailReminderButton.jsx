import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { sendEmail } from "../utils/emailTemplates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function EmailReminderButton({ 
  item, 
  type, // 'program', 'task', 'subtask', 'expense', 'staffpay'
  currentUser,
  size = "sm",
  variant = "outline" 
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const recipientEmail = item?.assignee || item?.staff_email || item?.assigned_to;

  const handleSendReminder = async () => {
    if (!item?.assignee && type !== 'expense' && type !== 'staffpay') {
      toast.error("No assignee to send reminder to");
      return;
    }

    if (!recipientEmail) {
      toast.error("No recipient email found");
      return;
    }

    setIsSending(true);
    try {
      let subject = "";
      let body = "";

      switch (type) {
        case 'program':
          subject = `Reminder: Program "${item.title}" requires attention`;
          body = `Hi there,\n\nThis is a friendly reminder about the program: ${item.title}\n\nStatus: ${item.status}\nPriority: ${item.priority}\nDue Date: ${item.due_date || 'Not set'}\n\nPlease review and take necessary action.\n\nBest regards,\nJaguars Team Management`;
          break;

        case 'task':
          subject = `Reminder: Task "${item.title}" requires attention`;
          body = `Hi there,\n\nThis is a friendly reminder about your task: ${item.title}\n\nStatus: ${item.completed ? 'Completed' : 'Pending'}\nDue Date: ${item.due_date || 'Not set'}\n\nPlease review and update your progress.\n\nBest regards,\nJaguars Team Management`;
          break;

        case 'subtask':
          subject = `Reminder: Subtask "${item.title}" requires attention`;
          body = `Hi there,\n\nThis is a friendly reminder about your subtask: ${item.title}\n\nStatus: ${item.status}\nPriority: ${item.priority}\nDue Date: ${item.due_date || 'Not set'}\nEstimated Hours: ${item.estimated_hours || 'Not set'}\n\nPlease review and update your progress.\n\nBest regards,\nJaguars Team Management`;
          break;

        case 'expense':
          subject = `Reminder: Expense approval needed - $${item.amount}`;
          body = `Hi there,\n\nThis is a reminder that an expense requires approval:\n\nAmount: $${item.amount}\nDescription: ${item.description}\nCategory: ${item.category || 'Not specified'}\nDate: ${item.date || 'Not specified'}\nStatus: ${item.status}\n\nPlease review and approve or reject this expense.\n\nBest regards,\nJaguars Team Management`;
          break;

        case 'staffpay':
          subject = `Reminder: Staff payment record - $${item.amount}`;
          body = `Hi there,\n\nThis is a reminder about a staff payment record:\n\nAmount: $${item.amount}\nRole: ${item.role || 'Not specified'}\nDate: ${item.date || 'Not specified'}\nPayment Status: ${item.payment_status}\n\nPlease review this payment record.\n\nBest regards,\nJaguars Team Management`;
          break;

        default:
          toast.error("Invalid item type");
          return;
      }

      await sendEmail({
        to: recipientEmail,
        subject,
        body,
        from_name: "Jaguars Team",
        templateType: 'custom',
        sentBy: currentUser?.email
      });

      toast.success(`Reminder sent to ${recipientEmail}`);
      setConfirmOpen(false);
    } catch (error) {
      console.error("Failed to send reminder:", error);
      toast.error("Failed to send reminder email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setConfirmOpen(true)}
        variant={variant}
        size={size}
        className="dark:border-slate-700"
      >
        <Bell className="w-3 h-3 mr-1" />
        Send Reminder
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="dark:bg-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">Send Email Reminder?</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-slate-400">
              This will send an email reminder to <strong>{recipientEmail}</strong> about this {type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSendReminder}
              disabled={isSending}
              className="bg-emerald-700 hover:bg-emerald-800"
            >
              {isSending ? "Sending..." : "Send Reminder"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}