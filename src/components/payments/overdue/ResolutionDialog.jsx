import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send, DollarSign, CalendarClock, Phone, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import RecordPaymentForm from "./RecordPaymentForm";
import PaymentPlanForm from "./PaymentPlanForm";
import ContactLogForm from "./ContactLogForm";
import ResolveCaseForm from "./ResolveCaseForm";
import CaseTimeline from "./CaseTimeline";
import { STATUS_META, BUCKET_META, money, formatDay, formatStamp } from "./caseStyles";

const ACTIONS = [
  { key: "payment", label: "Record payment", icon: DollarSign },
  { key: "plan", label: "Payment plan", icon: CalendarClock },
  { key: "contact", label: "Log contact", icon: Phone },
  { key: "resolve", label: "Close case", icon: CheckCircle2 },
];

/** Everything the club can do about one family's missed payments, in one place. */
export default function ResolutionDialog({ caseRecord, currentUser, onOpenChange, onAction }) {
  const [activeAction, setActiveAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reminding, setReminding] = useState(false);

  const open = !!caseRecord;
  if (!caseRecord) return null;

  const status = STATUS_META[caseRecord.status] || STATUS_META.open;
  const bucket = BUCKET_META[caseRecord.aging_bucket] || BUCKET_META["0-30"];

  const submit = async (action, payload) => {
    setBusy(true);
    try {
      await onAction(action, { case_id: caseRecord.id, ...payload });
      toast.success(
        action === "record_payment" ? "Payment recorded on the ledger"
          : action === "plan" ? "Payment plan saved"
            : action === "contact" ? "Logged on the case"
              : "Case closed",
      );
      setActiveAction(null);
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "That didn't save — try again.");
    } finally {
      setBusy(false);
    }
  };

  const remind = async () => {
    setReminding(true);
    try {
      await onAction("reminder", { case_id: caseRecord.id });
      toast.success(`Reminder sent to ${caseRecord.family_email}`);
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Reminder could not be sent.");
    } finally {
      setReminding(false);
    }
  };

  const stats = [
    { label: "Outstanding", value: money(caseRecord.amount_outstanding), tone: "text-rose-600" },
    { label: "Days overdue", value: caseRecord.days_overdue, tone: "text-text-primary" },
    { label: "Missed payments", value: caseRecord.late_payment_count || 0, tone: "text-text-primary" },
    { label: "Reminders sent", value: caseRecord.reminder_count || 0, tone: "text-text-primary" },
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) setActiveAction(null); onOpenChange(next); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap text-left">
            {caseRecord.player_name || "Unnamed account"}
            <Badge variant="outline" className={`text-[10px] ${bucket.className}`}>{bucket.label}</Badge>
            <Badge variant="outline" className={`text-[10px] ${status.className}`}>{status.label}</Badge>
            {caseRecord.priority !== "normal" && (
              <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">
                <AlertTriangle className="w-3 h-3 mr-1" />{caseRecord.priority}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border-subtle bg-surface-1 p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</p>
                <p className={`text-lg font-extrabold ${s.tone}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border-subtle p-3 space-y-1.5">
            <p className="text-xs text-text-secondary">
              <span className="font-semibold text-text-primary">{caseRecord.guardian_name || "No guardian on file"}</span>
              {caseRecord.family_email ? ` · ${caseRecord.family_email}` : " · no email on file"}
            </p>
            <p className="text-xs text-muted-foreground">
              {caseRecord.source_label}
              {caseRecord.team_name ? ` · ${caseRecord.team_name}` : ""}
              {caseRecord.branch_name ? ` · ${caseRecord.branch_name}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Oldest missed payment {formatDay(caseRecord.due_date)}
              {caseRecord.last_late_payment_date ? ` · most recent ${formatDay(caseRecord.last_late_payment_date)}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {caseRecord.assigned_to ? `Owned by ${caseRecord.assigned_name || caseRecord.assigned_to}` : "Not assigned"}
              {caseRecord.next_follow_up ? ` · follow up ${formatDay(caseRecord.next_follow_up)}` : ""}
              {caseRecord.last_contacted_at ? ` · last contact ${formatStamp(caseRecord.last_contacted_at)}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="rounded-xl" disabled={reminding || !caseRecord.family_email} onClick={remind}>
              {reminding ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
              Send reminder
            </Button>
            {ACTIONS.map((a) => (
              <Button
                key={a.key}
                size="sm"
                variant={activeAction === a.key ? "default" : "outline"}
                className="rounded-xl"
                onClick={() => setActiveAction(activeAction === a.key ? null : a.key)}
              >
                <a.icon className="w-3.5 h-3.5 mr-1.5" />{a.label}
              </Button>
            ))}
          </div>

          {activeAction === "payment" && <RecordPaymentForm caseRecord={caseRecord} busy={busy} onSubmit={(p) => submit("record_payment", p)} />}
          {activeAction === "plan" && <PaymentPlanForm caseRecord={caseRecord} busy={busy} onSubmit={(p) => submit("plan", p)} />}
          {activeAction === "contact" && <ContactLogForm caseRecord={caseRecord} currentUser={currentUser} busy={busy} onSubmit={(p) => submit("contact", p)} />}
          {activeAction === "resolve" && <ResolveCaseForm caseRecord={caseRecord} busy={busy} onSubmit={(p) => submit("resolve", p)} />}

          <div className="border-t border-border-subtle pt-3">
            <p className="text-xs font-semibold text-text-secondary mb-2">Case history</p>
            <CaseTimeline entries={caseRecord.timeline} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}