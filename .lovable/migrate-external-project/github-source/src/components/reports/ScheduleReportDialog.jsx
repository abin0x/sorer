import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, X, Plus, Mail } from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" }, { value: 1, label: "Monday" }, { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" }, { value: 4, label: "Thursday" }, { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

/**
 * Dialog for scheduling a saved report to email recipients.
 * Each recipient receives data scoped to their role.
 * props: { open, onClose, onSaved, savedReport }
 */
export default function ScheduleReportDialog({ open, onClose, onSaved, savedReport }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [frequency, setFrequency] = useState("weekly");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [recipientInput, setRecipientInput] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [format, setFormat] = useState("csv");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFrequency("weekly");
      setDayOfWeek(1);
      setDayOfMonth(1);
      setRecipients([]);
      setRecipientInput("");
      setFormat("csv");
    }
  }, [open]);

  const addRecipient = () => {
    const email = recipientInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Invalid email", description: email, variant: "destructive" });
      return;
    }
    if (recipients.includes(email)) {
      toast({ title: "Already added", description: email, variant: "destructive" });
      return;
    }
    setRecipients([...recipients, email]);
    setRecipientInput("");
  };

  const removeRecipient = (email) => setRecipients(recipients.filter((r) => r !== email));

  const handleSave = async () => {
    if (recipients.length === 0) {
      toast({ title: "Add at least one recipient", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.ReportSchedule.create({
        club_id: user.club_id,
        saved_report_id: savedReport.id,
        saved_report_name: savedReport.name,
        frequency,
        day_of_week: frequency === "weekly" ? dayOfWeek : null,
        day_of_month: frequency === "monthly" ? dayOfMonth : null,
        recipients,
        format,
        is_active: true,
        owner_id: user.id,
        owner_name: user.full_name,
      });
      toast({ title: "Schedule created", description: `${savedReport.name} will be emailed ${frequency}.` });
      onSaved?.();
      onClose();
    } catch (err) {
      toast({ title: "Failed to create schedule", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Schedule Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">{savedReport?.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{savedReport?.report_name}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {frequency === "weekly" ? (
              <div className="space-y-1.5">
                <Label>Day of week</Label>
                <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Day of month</Label>
                <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(Number(v))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV attachment</SelectItem>
                <SelectItem value="pdf">PDF attachment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Recipients</Label>
            <p className="text-xs text-muted-foreground">Each recipient receives only data their role allows.</p>
            <div className="flex gap-2">
              <Input
                type="email"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRecipient())}
                placeholder="email@example.com"
              />
              <Button variant="outline" size="icon" onClick={addRecipient} className="shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {recipients.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1 pr-1">
                    <Mail className="w-3 h-3" />
                    {email}
                    <button onClick={() => removeRecipient(email)} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}