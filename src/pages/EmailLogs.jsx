import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, Search, CheckCircle2, XCircle, Eye, Download, Filter } from "lucide-react";
import { format } from "date-fns";

export default function EmailLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const { data: emailLogs = [], isLoading } = useQuery({
    queryKey: ["emailLogs"],
    queryFn: () => base44.entities.EmailLog.list("-created_date"),
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: () => base44.entities.Program.list()
  });

  const filteredLogs = emailLogs.filter((log) => {
    const matchesSearch = 
      log.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTemplate = templateFilter === "all" || log.template_type === templateFilter;
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    
    return matchesSearch && matchesTemplate && matchesStatus;
  });

  const handleDownloadCSV = () => {
    const headers = [
      'Date',
      'Recipient Email',
      'Recipient Name',
      'Subject',
      'Template Type',
      'Status',
      'Sent By',
      'Program'
    ];

    const rows = filteredLogs.map(log => {
      const program = programs.find(p => p.id === log.related_program_id);
      return [
        format(new Date(log.created_date), 'yyyy-MM-dd HH:mm:ss'),
        log.recipient_email || '',
        log.recipient_name || '',
        log.subject || '',
        log.template_type || '',
        log.status || '',
        log.sent_by || '',
        program?.title || ''
      ].map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      });
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `email_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const templateTypeLabels = {
    program_assignment: "Program Assignment",
    task_assignment: "Task Assignment",
    expense_submission: "Expense Submission",
    expense_approval: "Expense Approved",
    expense_rejection: "Expense Rejected",
    staffpay_record: "Staff Pay Record",
    new_message: "New Message",
    test_email: "Test Email",
    custom: "Custom"
  };

  const templateTypeColors = {
    program_assignment: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    task_assignment: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    expense_submission: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    expense_approval: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    expense_rejection: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    staffpay_record: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    new_message: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
    test_email: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    custom: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  if (!['master_admin', 'admin', 'director', 'club_director', 'club_admin'].includes(currentUser.custom_role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Mail className="w-16 h-16 mx-auto mb-4 text-amber-500" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Access Restricted
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Only administrators can view email logs.
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Email Logs</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Track all automated emails sent by the system
            </p>
          </div>
          <Button
            onClick={handleDownloadCSV}
            variant="outline"
            className="border-slate-300 dark:border-slate-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Emails</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {emailLogs.length}
                  </p>
                </div>
                <Mail className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Successful</p>
                  <p className="text-2xl font-bold text-green-600">
                    {emailLogs.filter(log => log.status === 'success').length}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Failed</p>
                  <p className="text-2xl font-bold text-red-600">
                    {emailLogs.filter(log => log.status === 'failed').length}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Today</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {emailLogs.filter(log => {
                      const today = new Date();
                      const logDate = new Date(log.created_date);
                      return logDate.toDateString() === today.toDateString();
                    }).length}
                  </p>
                </div>
                <Mail className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="font-semibold text-slate-900 dark:text-white">Filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search emails..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 dark:bg-slate-800 dark:border-slate-700"
                />
              </div>

              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder="Template Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Templates</SelectItem>
                  <SelectItem value="program_assignment">Program Assignment</SelectItem>
                  <SelectItem value="task_assignment">Task Assignment</SelectItem>
                  <SelectItem value="expense_submission">Expense Submission</SelectItem>
                  <SelectItem value="expense_approval">Expense Approved</SelectItem>
                  <SelectItem value="expense_rejection">Expense Rejected</SelectItem>
                  <SelectItem value="staffpay_record">Staff Pay Record</SelectItem>
                  <SelectItem value="new_message">New Message</SelectItem>
                  <SelectItem value="test_email">Test Email</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Email Logs Table */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="dark:text-white">
              Email History ({filteredLogs.length} {filteredLogs.length === 1 ? 'email' : 'emails'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                <p className="text-slate-500 dark:text-slate-400">No emails found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => {
                  const program = programs.find(p => p.id === log.related_program_id);
                  return (
                    <div
                      key={log.id}
                      className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedEmail(log);
                        setDetailsDialogOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={templateTypeColors[log.template_type] || templateTypeColors.custom}>
                              {templateTypeLabels[log.template_type] || log.template_type}
                            </Badge>
                            <Badge className={log.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}>
                              {log.status === 'success' ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Sent
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Failed
                                </>
                              )}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-slate-900 dark:text-white mb-1 truncate">
                            {log.subject}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                            <span>To: {log.recipient_name || log.recipient_email}</span>
                            {program && (
                              <span>• Program: {program.title}</span>
                            )}
                            <span>• {format(new Date(log.created_date), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmail(log);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Email Details</DialogTitle>
            <DialogDescription>
              Full details of the sent email
            </DialogDescription>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</p>
                  <Badge className={selectedEmail.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}>
                    {selectedEmail.status === 'success' ? 'Sent Successfully' : 'Failed'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Template Type</p>
                  <Badge className={templateTypeColors[selectedEmail.template_type]}>
                    {templateTypeLabels[selectedEmail.template_type]}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Date Sent</p>
                  <p className="text-sm text-slate-900 dark:text-white">
                    {format(new Date(selectedEmail.created_date), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sent By</p>
                  <p className="text-sm text-slate-900 dark:text-white">
                    {selectedEmail.sent_by || 'System'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Recipient</p>
                <p className="text-sm text-slate-900 dark:text-white">
                  {selectedEmail.recipient_name && `${selectedEmail.recipient_name} - `}
                  {selectedEmail.recipient_email}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Subject</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {selectedEmail.subject}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Email Body</p>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border dark:border-slate-700 max-h-96 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap font-sans text-slate-900 dark:text-slate-300">
                    {selectedEmail.body}
                  </pre>
                </div>
              </div>

              {selectedEmail.status === 'failed' && selectedEmail.error_message && (
                <div>
                  <p className="text-xs text-red-500 mb-1">Error Message</p>
                  <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                    {selectedEmail.error_message}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}