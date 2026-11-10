import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Bell } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useTenant } from "@/lib/TenantContext";
import { hasPermission, ROLES } from "@/lib/rbac";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function ExpenseNotificationSettings({ user }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId || tenant.club?.id || user?.club_id;
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const canEdit = hasPermission(user, "finance:approve");

  const { data: settings } = useQuery({
    queryKey: ["expense-notification-settings", clubId],
    queryFn: async () => {
      const rows = await base44.entities.ExpenseNotificationSettings.filter({ club_id: clubId });
      if (rows[0]) return rows[0];
      const created = await base44.entities.ExpenseNotificationSettings.create({ club_id: clubId });
      return created;
    },
    enabled: !!clubId,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        reminder_days: settings.reminder_days ?? 3,
        escalation_days: settings.escalation_days ?? 7,
        batch_window_minutes: settings.batch_window_minutes ?? 15,
        weekly_digest_enabled: settings.weekly_digest_enabled ?? true,
        weekly_digest_day: settings.weekly_digest_day || "monday",
        monthly_digest_enabled: settings.monthly_digest_enabled ?? false,
        from_name: settings.from_name || "",
      });
    }
  }, [settings]);

  if (!form) return null;

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.ExpenseNotificationSettings.update(settings.id, form);
      queryClient.invalidateQueries({ queryKey: ["expense-notification-settings", clubId] });
      toast({ title: "Notification settings saved" });
    } catch (e) {
      toast({ title: "Something went wrong", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/60 rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <div>
            <CardTitle className="text-sm font-bold">Notification Settings</CardTitle>
            <p className="text-xs text-muted-foreground">Control reminder cadence, digest batching, and summary emails for expense approvals.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Reminder after (days)</Label>
            <Input type="number" min={1} disabled={!canEdit} value={form.reminder_days} onChange={(e) => setForm({ ...form, reminder_days: Number(e.target.value) || 0 })} className="h-9" />
            <p className="text-[10px] text-muted-foreground mt-1">Approvers get a nudge after this many days.</p>
          </div>
          <div>
            <Label className="text-xs">Escalate after (days)</Label>
            <Input type="number" min={1} disabled={!canEdit} value={form.escalation_days} onChange={(e) => setForm({ ...form, escalation_days: Number(e.target.value) || 0 })} className="h-9" />
            <p className="text-[10px] text-muted-foreground mt-1">Club director is escalated after this many days.</p>
          </div>
          <div>
            <Label className="text-xs">Batch window (minutes)</Label>
            <Input type="number" min={5} disabled={!canEdit} value={form.batch_window_minutes} onChange={(e) => setForm({ ...form, batch_window_minutes: Number(e.target.value) || 15 })} className="h-9" />
            <p className="text-[10px] text-muted-foreground mt-1">Approver notices are batched within this window.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <p className="text-sm font-medium">Weekly digest</p>
              <p className="text-[11px] text-muted-foreground">Email a weekly summary to bookkeepers and admins.</p>
            </div>
            <Switch checked={form.weekly_digest_enabled} disabled={!canEdit} onCheckedChange={(v) => setForm({ ...form, weekly_digest_enabled: v })} />
          </div>
          <div>
            <Label className="text-xs">Weekly digest day</Label>
            <Select value={form.weekly_digest_day} disabled={!canEdit || !form.weekly_digest_enabled} onValueChange={(v) => setForm({ ...form, weekly_digest_day: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <p className="text-sm font-medium">Monthly digest</p>
              <p className="text-[11px] text-muted-foreground">Email a monthly summary to bookkeepers and admins.</p>
            </div>
            <Switch checked={form.monthly_digest_enabled} disabled={!canEdit} onCheckedChange={(v) => setForm({ ...form, monthly_digest_enabled: v })} />
          </div>
          <div>
            <Label className="text-xs">Sender name override</Label>
            <Input disabled={!canEdit} value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} placeholder="Club name (default)" className="h-9" />
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end pt-2 border-t border-border/60">
            <Button disabled={saving} className="gap-1.5" onClick={save}>
              <Save className="w-4 h-4" /> Save settings
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}