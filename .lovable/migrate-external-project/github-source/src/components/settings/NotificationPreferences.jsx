import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Save } from "lucide-react";
import { toast } from "sonner";

export default function NotificationPreferences({ user }) {
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    in_app_notifications: true,
    program_deadline_reminders: true,
    task_assignments: true,
    expense_approvals: true,
    mentions: true
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (user?.notification_preferences) {
      setPreferences(user.notification_preferences);
    }
  }, [user]);

  const updatePreferencesMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe({ notification_preferences: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      toast.success("Notification preferences updated");
    },
  });

  const handleSave = () => {
    updatePreferencesMutation.mutate(preferences);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you want to receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Delivery Methods
          </h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email_notifications">Email Notifications</Label>
              <p className="text-xs text-slate-500">Receive notifications via email</p>
            </div>
            <Switch
              id="email_notifications"
              checked={preferences.email_notifications}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, email_notifications: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="in_app_notifications">In-App Notifications</Label>
              <p className="text-xs text-slate-500">Receive notifications in the app</p>
            </div>
            <Switch
              id="in_app_notifications"
              checked={preferences.in_app_notifications}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, in_app_notifications: checked })
              }
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold text-slate-900">Notification Types</h3>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="program_deadline_reminders">Program Deadline Reminders</Label>
              <p className="text-xs text-slate-500">Get reminded about upcoming program deadlines</p>
            </div>
            <Switch
              id="program_deadline_reminders"
              checked={preferences.program_deadline_reminders}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, program_deadline_reminders: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="task_assignments">Task Assignments</Label>
              <p className="text-xs text-slate-500">Be notified when tasks are assigned to you</p>
            </div>
            <Switch
              id="task_assignments"
              checked={preferences.task_assignments}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, task_assignments: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="expense_approvals">Expense Approvals</Label>
              <p className="text-xs text-slate-500">Get notified about expense approval requests</p>
            </div>
            <Switch
              id="expense_approvals"
              checked={preferences.expense_approvals}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, expense_approvals: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mentions">Mentions in Notes</Label>
              <p className="text-xs text-slate-500">Be notified when someone mentions you</p>
            </div>
            <Switch
              id="mentions"
              checked={preferences.mentions}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, mentions: checked })
              }
            />
          </div>
        </div>

        <Button 
          onClick={handleSave}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          disabled={updatePreferencesMutation.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}