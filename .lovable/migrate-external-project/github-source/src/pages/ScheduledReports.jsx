import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Mail, 
  Plus, 
  Trash2, 
  AlertCircle,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function ScheduledReports() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    frequency: "weekly",
    recipients: "",
    include_programs: true,
    include_tasks: true,
    include_expenses: true,
    include_budget: true,
    is_active: true
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["scheduledReports"],
    queryFn: async () => {
      // For now, store in a custom entity
      try {
        return await base44.entities.ScheduledReport.list("-created_date");
      } catch (error) {
        return [];
      }
    }
  });

  const createReportMutation = useMutation({
    mutationFn: (data) => base44.entities.ScheduledReport.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduledReports"] });
      toast.success("Report schedule created");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create report: ${error.message}`);
    }
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id) => base44.entities.ScheduledReport.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduledReports"] });
      toast.success("Report schedule deleted");
    }
  });

  const toggleReportMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.ScheduledReport.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduledReports"] });
      toast.success("Report status updated");
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      frequency: "weekly",
      recipients: "",
      include_programs: true,
      include_tasks: true,
      include_expenses: true,
      include_budget: true,
      is_active: true
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Report name is required");
      return;
    }

    if (!formData.recipients.trim()) {
      toast.error("At least one recipient is required");
      return;
    }

    const recipientList = formData.recipients.split(',').map(e => e.trim()).filter(Boolean);

    createReportMutation.mutate({
      ...formData,
      recipients: recipientList,
      created_by: currentUser?.email
    });
  };

  const canManage = ['master_admin', 'admin', 'director', 'club_director', 'club_admin'].includes(currentUser?.custom_role);

  if (!canManage) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Card className="max-w-md dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Only Admins and Directors can manage scheduled reports.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Scheduled Reports</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Configure automated email reports for stakeholders
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-emerald-700 hover:bg-emerald-800">
            <Plus className="w-4 h-4 mr-2" />
            New Report
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {reports.length === 0 ? (
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="pt-12 pb-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                <p className="text-slate-500 dark:text-slate-400">
                  No scheduled reports yet. Create one to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            reports.map((report) => (
              <Card key={report.id} className="dark:bg-slate-900 dark:border-slate-800">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {report.name}
                        </h3>
                        <Badge className={report.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                          {report.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="dark:border-slate-700">
                          <Calendar className="w-3 h-3 mr-1" />
                          {report.frequency}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Mail className="w-4 h-4" />
                          <span>Recipients: {Array.isArray(report.recipients) ? report.recipients.join(', ') : report.recipients}</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          {report.include_programs && <Badge variant="outline" className="text-xs">Programs</Badge>}
                          {report.include_tasks && <Badge variant="outline" className="text-xs">Tasks</Badge>}
                          {report.include_expenses && <Badge variant="outline" className="text-xs">Expenses</Badge>}
                          {report.include_budget && <Badge variant="outline" className="text-xs">Budget</Badge>}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={report.is_active ? "outline" : "default"}
                        onClick={() => toggleReportMutation.mutate({ id: report.id, is_active: !report.is_active })}
                      >
                        {report.is_active ? "Pause" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this report schedule?")) {
                            deleteReportMutation.mutate(report.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Card className="dark:bg-slate-900 dark:border-slate-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-slate-900">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">How it works</h3>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
              <li>Reports are sent automatically based on the frequency you set</li>
              <li>Daily reports are sent at 8 AM, weekly on Mondays, monthly on the 1st</li>
              <li>Recipients receive an email with attached PDF containing the selected data</li>
              <li>You can pause or delete reports at any time</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="dark:text-white">Create Scheduled Report</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="dark:text-slate-300">Report Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Weekly Program Summary"
                required
                className="dark:bg-slate-800 dark:border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-300">Frequency *</Label>
              <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly (Mondays)</SelectItem>
                  <SelectItem value="monthly">Monthly (1st of month)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipients" className="dark:text-slate-300">Recipients * (comma-separated emails)</Label>
              <Input
                id="recipients"
                value={formData.recipients}
                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
                required
                className="dark:bg-slate-800 dark:border-slate-700"
              />
            </div>

            <div className="space-y-3">
              <Label className="dark:text-slate-300">Include in Report</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_programs"
                    checked={formData.include_programs}
                    onCheckedChange={(checked) => setFormData({ ...formData, include_programs: checked })}
                  />
                  <Label htmlFor="include_programs" className="cursor-pointer dark:text-slate-300">
                    Programs Summary
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_tasks"
                    checked={formData.include_tasks}
                    onCheckedChange={(checked) => setFormData({ ...formData, include_tasks: checked })}
                  />
                  <Label htmlFor="include_tasks" className="cursor-pointer dark:text-slate-300">
                    Tasks Status
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_expenses"
                    checked={formData.include_expenses}
                    onCheckedChange={(checked) => setFormData({ ...formData, include_expenses: checked })}
                  />
                  <Label htmlFor="include_expenses" className="cursor-pointer dark:text-slate-300">
                    Expenses & Approvals
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include_budget"
                    checked={formData.include_budget}
                    onCheckedChange={(checked) => setFormData({ ...formData, include_budget: checked })}
                  />
                  <Label htmlFor="include_budget" className="cursor-pointer dark:text-slate-300">
                    Budget Analysis
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800">
                Create Report
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}