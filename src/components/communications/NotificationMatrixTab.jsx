import DOMPurify from "dompurify";
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2, Mail, MessageSquare, Bell, Smartphone, ShieldAlert, Check, Eye,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTenant } from "@/lib/TenantContext";

const CHANNEL_ICON = { Email: Mail, SMS: MessageSquare, "In-App": Bell, Push: Smartphone };
const ALL_CHANNELS = ["Email", "SMS", "In-App", "Push"];

const DEFAULT_NOTIFICATIONS = [
  { module: "Registration & Family", trigger_event: "Registration Confirmed", audience: "Parent/Guardian", channels: ["Email", "In-App"], subject_template: "Your registration for [Player Name] has been confirmed. Welcome to the [Club Name] family!", is_critical: false, is_active: true, order: 1 },
  { module: "Registration & Family", trigger_event: "Registration Pending", audience: "Parent/Guardian", channels: ["Email"], subject_template: "We've received your registration for [Player Name]. Our team will review and confirm shortly.", is_critical: false, is_active: true, order: 2 },
  { module: "Registration & Family", trigger_event: "Payment Received", audience: "Parent/Guardian", channels: ["Email", "In-App"], subject_template: "Thank you! Your payment of [Amount] has been received for [Player Name]'s registration.", is_critical: false, is_active: true, order: 3 },
  { module: "Registration & Family", trigger_event: "Payment Overdue", audience: "Parent/Guardian", channels: ["Email", "Push"], subject_template: "Your payment for [Player Name] is overdue. Please complete payment to avoid registration suspension.", is_critical: true, is_active: true, order: 4 },
  { module: "Scheduling & Events", trigger_event: "Training Session Reminder", audience: "Parent/Guardian, Player", channels: ["In-App", "Push"], subject_template: "Reminder: [Player Name] has a training session on [Date] at [Time] at [Location].", is_critical: false, is_active: true, order: 1 },
  { module: "Scheduling & Events", trigger_event: "Game Day Reminder", audience: "Parent/Guardian, Player", channels: ["Email", "In-App", "Push"], subject_template: "Game day! [Team Name] plays on [Date] at [Time] at [Location]. Don't forget your kit!", is_critical: false, is_active: true, order: 2 },
  { module: "Scheduling & Events", trigger_event: "Schedule Change", audience: "Parent/Guardian, Coach", channels: ["Email", "In-App"], subject_template: "Schedule update: [Event Name] has been changed to [New Date/Time]. Please update your calendar.", is_critical: true, is_active: true, order: 3 },
  { module: "Scheduling & Events", trigger_event: "Event Cancellation", audience: "Parent/Guardian, Coach", channels: ["Email", "Push"], subject_template: "Cancelled: [Event Name] on [Date] has been cancelled. We apologize for the inconvenience.", is_critical: true, is_active: true, order: 4 },
  { module: "Communication", trigger_event: "New Message", audience: "Parent/Guardian, Coach, Player", channels: ["In-App", "Push"], subject_template: "You have a new message from [Sender Name] in [Channel Name].", is_critical: false, is_active: true, order: 1 },
  { module: "Communication", trigger_event: "Announcement", audience: "All Members", channels: ["Email", "In-App"], subject_template: "[Announcement Title] - [Announcement Body Preview]", is_critical: false, is_active: true, order: 2 },
  { module: "Bookkeeping & Kanban", trigger_event: "Expense Report Submitted", audience: "Director/Admin", channels: ["Email", "In-App"], subject_template: "New expense report from [Staff Name] for [Amount] awaiting approval.", is_critical: false, is_active: true, order: 1 },
  { module: "Bookkeeping & Kanban", trigger_event: "Expense Approved", audience: "Staff Member", channels: ["Email", "In-App"], subject_template: "Your expense report of [Amount] has been approved and will be processed.", is_critical: false, is_active: true, order: 2 },
  { module: "Bookkeeping & Kanban", trigger_event: "Expense Rejected", audience: "Staff Member", channels: ["Email"], subject_template: "Your expense report of [Amount] was not approved. Reason: [Rejection Reason]. Please revise and resubmit.", is_critical: false, is_active: true, order: 3 },
  { module: "Player Development", trigger_event: "Evaluation Published", audience: "Parent/Guardian, Player", channels: ["Email", "In-App"], subject_template: "A new evaluation for [Player Name] is available. View the feedback in the app.", is_critical: false, is_active: true, order: 1 },
  { module: "Player Development", trigger_event: "Skill Test Results", audience: "Parent/Guardian, Player", channels: ["In-App"], subject_template: "Skill test results for [Player Name] are now available. Check the Player Development center.", is_critical: false, is_active: true, order: 2 },
  { module: "Player Support", trigger_event: "Support Ticket Created", audience: "Director/Admin", channels: ["Email", "In-App"], subject_template: "New support ticket from [User Name]: [Ticket Subject]", is_critical: false, is_active: true, order: 1 },
  { module: "Player Support", trigger_event: "Support Ticket Reply", audience: "Ticket Submitter", channels: ["Email", "In-App"], subject_template: "Your support ticket has a new reply. View the conversation in the Help Center.", is_critical: false, is_active: true, order: 2 },
];

function InlineField({ value, onSave, multiline, disabled, className }) {
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setVal(value), [value]);

  const commit = async () => {
    if (val === value) return;
    setSaving(true);
    try {
      await onSave(val);
    } catch (e) {
      setVal(value);
    } finally {
      setSaving(false);
    }
  };

  if (multiline) {
    return (
      <div className="relative">
        <Textarea
          value={val}
          disabled={disabled}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          rows={4}
          className={`text-xs resize-y ${className || ""}`}
        />
        {saving && <Loader2 className="w-3 h-3 animate-spin absolute top-2 right-2 text-muted-foreground" />}
      </div>
    );
  }
  return (
    <Input
      value={val}
      disabled={disabled}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      className={`text-xs h-7 ${className || ""}`}
    />
  );
}

function ChannelEditor({ row, onUpdate }) {
  const channels = row.channels || [];
  const toggle = (ch) => {
    const next = channels.includes(ch) ? channels.filter((c) => c !== ch) : [...channels, ch];
    onUpdate(next);
  };
  return (
    <div className="flex gap-1 flex-wrap">
      {ALL_CHANNELS.map((ch) => {
        const Icon = CHANNEL_ICON[ch] || Bell;
        const active = channels.includes(ch);
        return (
          <button
            key={ch}
            type="button"
            onClick={() => toggle(ch)}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] border transition-colors ${
              active ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="w-2.5 h-2.5" /> {ch}
          </button>
        );
      })}
    </div>
  );
}

function EmailPreview({ row, open, onOpenChange }) {
  const { brand } = useTenant();
  const clubName = brand.club_name;
  const logoUrl = brand.logo_url;
  const primary = brand.primary_color;
  const accent = brand.accent_color;

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e8e8e8;">
      <div style="background: linear-gradient(135deg, ${primary}, ${primary}dd); padding: 28px 32px; display: flex; align-items: center; gap: 14px;">
        ${logoUrl ? `<img src="${logoUrl}" alt="${clubName}" style="height: 40px; width: auto; border-radius: 8px; background: #fff; padding: 4px;" />` : `<div style="width: 40px; height: 40px; background: #fff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: ${primary};">${clubName?.[0] || "J"}</div>`}
        <div>
          <div style="color: #fff; font-size: 20px; font-weight: 800;">${clubName}</div>
          <div style="color: #ffffffcc; font-size: 12px;">${row.module}</div>
        </div>
      </div>
      <div style="padding: 28px 32px;">
        <h2 style="color: ${primary}; margin: 0 0 16px; font-size: 18px;">${row.trigger_event}</h2>
        <div style="color: #444; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${row.subject_template || ""}</div>
      </div>
      <div style="background: ${accent}11; padding: 16px 32px; border-top: 1px solid #eee;">
        <p style="color: #888; font-size: 11px; margin: 0;">This message was sent by ${clubName}. You can manage your notification preferences in the app.</p>
      </div>
    </div>`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> Email Preview — {row.trigger_event}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html || "") }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function NotificationMatrixTab({ canManage }) {
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["notification-matrix"],
    queryFn: () => base44.entities.NotificationMatrix.list("order", 200),
  });

  const [activeModule, setActiveModule] = useState(null);
  const [previewRow, setPreviewRow] = useState(null);
  const [seeding, setSeeding] = useState(false);

  // Auto-seed default notification rows when a club has none yet
  useEffect(() => {
    if (!isLoading && !seeding && rows.length === 0 && canManage) {
      setSeeding(true);
      base44.entities.NotificationMatrix.bulkCreate(DEFAULT_NOTIFICATIONS)
        .then(() => queryClient.invalidateQueries({ queryKey: ["notification-matrix"] }))
        .catch(() => {})
        .finally(() => setSeeding(false));
    }
  }, [isLoading, rows.length, canManage, seeding]);
  const modules = [...new Set(rows.map((r) => r.module))];
  const visibleModules = activeModule ? [activeModule] : modules;

  const updateField = async (id, field, value) => {
    try {
      await base44.entities.NotificationMatrix.update(id, { [field]: value });
      queryClient.invalidateQueries({ queryKey: ["notification-matrix"] });
      toast.success("Saved");
    } catch (e) {
      toast.error("Failed to save");
      throw e;
    }
  };

  const toggleActive = async (row) => {
    await updateField(row.id, "is_active", !row.is_active);
  };

  const toggleCritical = async (row) => {
    await updateField(row.id, "is_critical", !row.is_critical);
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Every field is inline-editable. Click any cell to edit the trigger, audience, channels, or message content.
        The subject/content field supports multi-paragraph, personable messages.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveModule(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!activeModule ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
        >
          All Modules
        </button>
        {modules.map((m) => (
          <button
            key={m}
            onClick={() => setActiveModule(m)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${activeModule === m ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            {m}
          </button>
        ))}
      </div>

      {visibleModules.map((moduleName) => {
        const moduleRows = rows.filter((r) => r.module === moduleName);
        if (moduleRows.length === 0) return null;
        return (
          <Card key={moduleName} className="adisal-card">
            <CardContent className="p-4">
              <h3 className="font-bold text-sm mb-3">{moduleName}</h3>
              <div className="space-y-2">
                {moduleRows.map((row) => (
                  <div key={row.id} className="border border-border/60 rounded-xl p-3 space-y-2 hover:border-border transition-colors">
                    {/* Row 1: trigger + audience + toggles */}
                    <div className="flex items-start gap-3 flex-wrap">
                      <div className="flex-1 min-w-[180px]">
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Trigger</Label>
                        <div className="flex items-center gap-1.5">
                          <InlineField
                            value={row.trigger_event}
                            disabled={!canManage}
                            onSave={(v) => updateField(row.id, "trigger_event", v)}
                          />
                          {row.is_critical && (
                            <button onClick={() => canManage && toggleCritical(row)} title="Critical alert">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-[140px]">
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Audience</Label>
                        <InlineField
                          value={row.audience}
                          disabled={!canManage}
                          onSave={(v) => updateField(row.id, "audience", v)}
                        />
                      </div>
                      <div className="flex items-center gap-3 shrink-0 pt-4">
                        {canManage && (
                          <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
                            <Checkbox checked={row.is_critical} onCheckedChange={() => toggleCritical(row)} /> Critical
                          </label>
                        )}
                        {canManage && (
                          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Switch checked={row.is_active} onCheckedChange={() => toggleActive(row)} /> Active
                          </label>
                        )}
                        <button
                          onClick={() => setPreviewRow(row)}
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                        >
                          <Eye className="w-3 h-3" /> Preview
                        </button>
                      </div>
                    </div>

                    {/* Row 2: channels */}
                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Channels</Label>
                      {canManage ? (
                        <ChannelEditor row={row} onUpdate={(ch) => updateField(row.id, "channels", ch)} />
                      ) : (
                        <div className="flex gap-1 flex-wrap pt-1">
                          {(row.channels || []).map((c) => {
                            const Icon = CHANNEL_ICON[c] || Bell;
                            return <Badge key={c} variant="outline" className="text-[10px] gap-1"><Icon className="w-2.5 h-2.5" /> {c}</Badge>;
                          })}
                        </div>
                      )}
                    </div>

                    {/* Row 3: subject/content */}
                    <div>
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Subject / Content (multi-paragraph, personable)</Label>
                      <InlineField
                        value={row.subject_template}
                        disabled={!canManage}
                        multiline
                        onSave={(v) => updateField(row.id, "subject_template", v)}
                        className="font-sans"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {previewRow && <EmailPreview row={previewRow} open={!!previewRow} onOpenChange={() => setPreviewRow(null)} />}
    </div>
  );
}

function Label({ className, children }) {
  return <span className={`block ${className || ""}`}>{children}</span>;
}