import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mail, Save, Eye, AlertCircle, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";
import NotificationMatrixTab from "@/components/communications/NotificationMatrixTab";
import GeneratedEmailsTab from "@/components/emailtemplates/GeneratedEmailsTab";
import { useTenant } from '@/lib/TenantContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const templateTypes = [
  { value: "program_assignment", label: "Program Assignment" },
  { value: "task_assignment", label: "Task Assignment" },
  { value: "expense_submission", label: "Expense Submission" },
  { value: "expense_approval", label: "Expense Approval" },
  { value: "expense_rejection", label: "Expense Rejection" },
  { value: "staffpay_record", label: "Staff Pay Record" },
  { value: "new_message", label: "New Message/Mention" }
];

const defaultTemplates = {
  program_assignment: {
    subject: "New Program Assignment: {{program.title}}",
    body: "Hi {{assignee.full_name}},\n\n{{assigner.full_name}} has assigned you to lead a new program:\n\nProgram: {{program.title}}\nDescription: {{program.description}}\nStatus: {{program.status}}\nPriority: {{program.priority}}\nBranch: {{program.branch}}\nSeason: {{program.season}}\nStart Date: {{program.suggested_start_date}}\nDue Date: {{program.due_date}}\n\nPlease review the program details and start planning your approach.\n\nBest regards,\nJaguars Team Management"
  },
  task_assignment: {
    subject: "New Task Assignment: {{task.title}}",
    body: "Hi {{assignee.full_name}},\n\n{{assigner.full_name}} has assigned you a new task:\n\nTask: {{task.title}}\nDescription: {{task.description}}\nProgram: {{program.title}}\nDue Date: {{task.due_date}}\nStatus: {{task.completed}}\n\nPlease review the task and update your progress accordingly.\n\nBest regards,\nJaguars Team Management"
  },
  expense_submission: {
    subject: "New Expense Submitted: ${{expense.amount}} - {{program.title}}",
    body: "A new expense has been submitted and requires approval:\n\nAmount: ${{expense.amount}}\nSubmitted by: {{submitter.full_name}}\nDescription: {{expense.description}}\nProgram: {{program.title}}\nCategory: {{expense.category}}\nDate: {{expense.date}}\n\nPlease review and approve or reject this expense.\n\nBest regards,\nJaguars Team Management"
  },
  expense_approval: {
    subject: "Expense Approved: ${{expense.amount}}",
    body: "Hi {{submitter.full_name}},\n\nYour expense has been approved:\n\nAmount: ${{expense.amount}}\nDescription: {{expense.description}}\nProgram: {{program.title}}\nApproved by: {{approver.full_name}}\nApproval Date: {{expense.approval_date}}\nNotes: {{expense.approval_notes}}\n\nBest regards,\nJaguars Team Management"
  },
  expense_rejection: {
    subject: "Expense Rejected: ${{expense.amount}}",
    body: "Hi {{submitter.full_name}},\n\nYour expense has been rejected:\n\nAmount: ${{expense.amount}}\nDescription: {{expense.description}}\nProgram: {{program.title}}\nRejected by: {{approver.full_name}}\nRejection Date: {{expense.approval_date}}\nReason: {{expense.approval_notes}}\n\nPlease review the reason and resubmit if necessary.\n\nBest regards,\nJaguars Team Management"
  },
  staffpay_record: {
    subject: "Staff Payment Record: ${{staffPay.amount}} - {{program.title}}",
    body: "Hi {{payee.full_name}},\n\nA staff payment record has been created for you:\n\nAmount: ${{staffPay.amount}}\nProgram: {{program.title}}\nRole: {{staffPay.role}}\nHours Worked: {{staffPay.hours_worked}}\nDate: {{staffPay.date}}\nPayment Status: {{staffPay.payment_status}}\n\nBest regards,\nJaguars Team Management"
  },
  new_message: {
    subject: "You were mentioned in {{program.title}}",
    body: "Hi {{recipient.full_name}},\n\n{{sender.full_name}} mentioned you in a message:\n\nProgram: {{program.title}}\nMessage: {{message.content}}\n\nPlease check the program chat to respond.\n\nBest regards,\nJaguars Team Management"
  },
  staff_invitation: {
    subject: "You're invited to join {{club_name}} as a {{role_label}}",
    body: "<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;\"><h2 style=\"color:#399F7D;\">You're Invited to {{club_name}}</h2><p>Hi {{full_name}},</p><p><strong>{{invited_by_name}}</strong> has invited you to join <strong>{{club_name}}</strong> on Club Rudder OS.</p><p><strong>Your role upon validation:</strong> {{role_label}}</p><p>Click the button below to set up your account:</p><p><a href=\"{{action_url}}\" style=\"display:inline-block;background-color:#399F7D;color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;\">Accept Invitation</a></p><p style=\"color:#94a3b8;font-size:13px;\">If the button doesn't work, copy and paste this link:<br/>{{action_url}}</p><p style=\"color:#94a3b8;font-size:12px;\">This invitation was sent by {{invited_by_name}}.</p></div>"
  }
};

export default function EmailTemplates() {
  const { effectiveClubId } = useTenant();
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedType, setSelectedType] = useState("program_assignment");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: templates = [] } = useQuery({
    queryKey: ["emailTemplates", effectiveClubId],
    queryFn: () => base44.entities.EmailTemplate.filter({ club_id: effectiveClubId || null }),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
      toast.success("Email template saved");
      setEditingTemplate(null);
    },
    onError: (error) => {
      console.error("Failed to save template:", error);
      toast.error("Failed to save template");
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmailTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
      toast.success("Email template updated");
      setEditingTemplate(null);
    },
    onError: (error) => {
      console.error("Failed to update template:", error);
      toast.error("Failed to update template");
    }
  });

  const sendTestEmailMutation = useMutation({
    mutationFn: async ({ email, template }) => {
      const response = await base44.functions.invoke('sendEmail', {
        to: email,
        subject: template.subject,
        html: "<pre style=\"font-family: monospace; white-space: pre-wrap;\">" + template.body + "</pre>",
        text: template.body,
        from_name: "Club Rudder Test"
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Test email sent successfully");
      setTestEmailDialogOpen(false);
      setTestEmail("");
    },
    onError: (error) => {
      console.error("Failed to send test email:", error);
      toast.error("Failed to send test email");
    }
  });

  useEffect(() => {
    const template = templates.find(t => t.template_type === selectedType);
    if (template) {
      setEditingTemplate(template);
    } else {
      setEditingTemplate({
        template_type: selectedType,
        subject: defaultTemplates[selectedType]?.subject || "",
        body: defaultTemplates[selectedType]?.body || "",
        is_active: true
      });
    }
  }, [selectedType, templates]);

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailTemplate.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['emailTemplates'] }); toast.success('Template deleted; automated workflows use their default if no saved template exists.'); },
    onError: (e) => toast.error(e.message),
  });
  const handleSave = () => {
    if (!editingTemplate) return;
    if (!editingTemplate.subject.trim() || !editingTemplate.body.trim()) { toast.error('Subject and body are required'); return; }
    if (editingTemplate.template_type === 'staff_invitation' && !editingTemplate.body.includes('{{action_url}}')) { toast.error('Keep {{action_url}} in the invitation so the recipient can accept it.'); return; }

    if (editingTemplate.id) {
      updateTemplateMutation.mutate({
        id: editingTemplate.id,
        data: {
          subject: editingTemplate.subject,
          body: editingTemplate.body,
          is_active: editingTemplate.is_active
        }
      });
    } else {
      createTemplateMutation.mutate({ ...editingTemplate, club_id: effectiveClubId || null });
    }
  };

  const handleSendTest = () => {
    if (!testEmail || !editingTemplate) return;
    sendTestEmailMutation.mutate({
      email: testEmail,
      template: editingTemplate
    });
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  if (currentUser.role !== 'admin' && currentUser.system_role !== 'system_owner' && !['club_director', 'club_admin'].includes(currentUser.custom_role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Access Restricted
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Only administrators can manage email templates.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Communications &amp; Engagement</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Email templates, notification matrix, and messaging
            </p>
          </div>
          <Badge className="bg-gradient-to-r from-amber-600 to-amber-700 text-white">
            <Mail className="w-3 h-3 mr-1" />
            Admin Only
          </Badge>
        </div>

        <Tabs defaultValue="templates">
          <TabsList className="rounded-xl">
            <TabsTrigger value="templates" className="rounded-lg">Email Templates</TabsTrigger>
            <TabsTrigger value="generated" className="rounded-lg">Generated Emails</TabsTrigger>
            <TabsTrigger value="matrix" className="rounded-lg">Notification Matrix</TabsTrigger>
          </TabsList>

          <TabsContent value="generated" className="mt-4">
            <GeneratedEmailsTab />
          </TabsContent>

          <TabsContent value="matrix" className="mt-4">
            <NotificationMatrixTab canManage={currentUser?.role === 'admin' || !!currentUser?.system_role || ['master_admin', 'admin', 'club_director', 'club_admin'].includes(currentUser?.custom_role)} />
          </TabsContent>

          <TabsContent value="templates" className="mt-4 space-y-6">
        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Using Variables:</strong> Use double curly braces to insert dynamic data:
                </p>
                <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1 pl-4">
                  <div>• <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{assignee.full_name}}'}</code> - Recipient&apos;s name</div>
                  <div>• <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{program.title}}'}</code> - Program title</div>
                  <div>• <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{expense.amount}}'}</code> - Dollar amount</div>
                  <div>• <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{task.due_date}}'}</code> - Date fields</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Mail className="w-5 h-5" />
              Template Editor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Template Type Selector */}
            <div>
              <Label className="dark:text-slate-300">Template Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...templateTypes, ...templates.filter(t => !templateTypes.some(type => type.value === t.template_type)).map(t => ({ value: t.template_type, label: t.template_type }))].map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Editor */}
            {editingTemplate && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="subject" className="dark:text-slate-300">
                    Email Subject
                  </Label>
                  <Input
                    id="subject"
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      subject: e.target.value
                    })}
                    placeholder="Enter email subject..."
                    className="dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>

                <div>
                  <Label htmlFor="body" className="dark:text-slate-300">
                    Email Body
                  </Label>
                  <Textarea
                    id="body"
                    value={editingTemplate.body}
                    onChange={(e) => setEditingTemplate({
                      ...editingTemplate,
                      body: e.target.value
                    })}
                    placeholder="Enter email body..."
                    rows={15}
                    className="font-mono text-sm dark:bg-slate-800 dark:border-slate-700"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-4 border-t dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${editingTemplate.is_active ? 'text-green-600' : 'text-slate-400'}`} />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {editingTemplate.is_active ? 'Active Template' : 'Inactive Template'}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => {
                      const name = window.prompt('New template name (unique workflow key):');
                      if (!name?.trim()) return;
                      const key = name.trim().toLowerCase().replace(/\s+/g, '_');
                      if (templates.some(t => t.template_type === key) || templateTypes.some(t => t.value === key)) { toast.error('That template already exists'); return; }
                      setSelectedType(key); setEditingTemplate({ template_type: key, subject: '', body: '', is_active: true });
                    }}>Add Template</Button>
                    {editingTemplate.id && <Button variant="destructive" disabled={deleteTemplateMutation.isPending} onClick={() => { if (window.confirm('Delete this template? Automated emails will revert to their default content.')) deleteTemplateMutation.mutate(editingTemplate.id); }}>Delete</Button>}
                    <Button
                      variant="outline"
                      onClick={() => setPreviewDialogOpen(true)}
                      className="dark:border-slate-700"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setTestEmailDialogOpen(true)}
                      className="dark:border-slate-700"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Test
                    </Button>
                    <Button
                      onClick={handleSave}
                      className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Template
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sending Configuration */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="dark:text-white">Email Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Sending Domain</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Email address used for sending</p>
              </div>
              <Badge variant="outline" className="dark:border-slate-700">
                Configured in Connections
              </Badge>
            </div>
            <div className="flex justify-between items-center py-2">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Email Provider</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Service used for sending emails</p>
              </div>
              <Badge variant="outline" className="dark:border-slate-700">
                Resend
              </Badge>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t dark:border-slate-700">
              Make sure to verify your domain in Resend dashboard to ensure email delivery.
            </div>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Email Preview</DialogTitle>
            <DialogDescription>
              Preview how the email will look (with sample data)
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-slate-500 dark:text-slate-400">Subject</Label>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700 mt-1">
                  <p className="text-sm font-medium dark:text-white">{editingTemplate.subject}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500 dark:text-slate-400">Body</Label>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700 mt-1 max-h-96 overflow-y-auto">
                  <iframe title="Email preview" sandbox="" srcDoc={editingTemplate.body} className="w-full h-80 border-0 bg-background" />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={testEmailDialogOpen} onOpenChange={setTestEmailDialogOpen}>
        <DialogContent className="dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email to verify the template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="test-email" className="dark:text-slate-300">Email Address</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter email address..."
                className="dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Note: The test email will contain placeholder data (not real data from your system).
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setTestEmailDialogOpen(false);
                  setTestEmail("");
                }}
                className="dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendTest}
                disabled={!testEmail || sendTestEmailMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <Send className="w-4 h-4 mr-2" />
                {sendTestEmailMutation.isPending ? 'Sending...' : 'Send Test'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}