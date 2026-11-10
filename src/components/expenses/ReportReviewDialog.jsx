import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Undo2, XCircle, DollarSign, Paperclip, Flag, Eye, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ExpenseStatusBadge from "./ExpenseStatusBadge";
import { round2 } from "@/lib/expenseHelpers";

export default function ReportReviewDialog({ open, onOpenChange, report, reviewer, onUpdated }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lines, setLines] = useState([]);
  const [returnReason, setReturnReason] = useState("");
  const [paymentRef, setPaymentRef] = useState({ method: "", reference: "" });
  const [saving, setSaving] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState({});

  const viewReceipt = async (receipt) => {
    setReceiptLoading((prev) => ({ ...prev, [receipt.file_uri]: true }));
    try {
      const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: receipt.file_uri });
      window.open(res.signed_url, "_blank");
    } catch (e) {
      toast({ title: "Could not open receipt", description: e.message, variant: "destructive" });
    } finally {
      setReceiptLoading((prev) => ({ ...prev, [receipt.file_uri]: false }));
    }
  };

  useEffect(() => {
    if (!open || !report) return;
    base44.entities.ExpenseLine.filter({ report_id: report.id }).then((rows) =>
      setLines(rows.map((l) => ({ ...l, approved_amount: l.approved_amount ?? l.amount })))
    );
    setReturnReason("");
  }, [open, report]);

  if (!report) return null;

  const approvedTotal = round2(lines.reduce((s, l) => s + (Number(l.approved_amount) || 0), 0));

  const updateLineField = (id, field, value) => setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));

  const saveLines = async () => {
    for (const l of lines) {
      await base44.entities.ExpenseLine.update(l.id, { approved_amount: l.approved_amount, approver_comment: l.approver_comment, flagged: l.flagged });
    }
  };

  const transition = async (status, extra = {}) => {
    if (status === "returned" && !extra.return_reason?.trim()) {
      toast({ title: "Reason required", description: "Explain what the submitter needs to fix.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await saveLines();
      const history = [...(report.status_history || []), { status, by_name: reviewer.full_name, at: new Date().toISOString(), note: extra.return_reason || "" }];
      await base44.entities.ExpenseReport.update(report.id, {
        status,
        approved_total: status === "approved" ? approvedTotal : report.approved_total,
        reviewer_id: reviewer.id,
        reviewer_name: reviewer.full_name,
        approved_date: status === "approved" ? new Date().toISOString() : report.approved_date,
        status_history: history,
        ...extra,
      });
      queryClient.invalidateQueries({ queryKey: ["expense-approval-queue"] });
      toast({ title: `Report ${status.replace("_", " ")}` });
      base44.functions.invoke("expense-notify", { event: status, reportId: report.id }).catch(() => {});
      onUpdated?.();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Something went wrong", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async () => {
    setSaving(true);
    try {
      const history = [...(report.status_history || []), { status: "paid", by_name: reviewer.full_name, at: new Date().toISOString() }];
      await base44.entities.ExpenseReport.update(report.id, {
        status: "paid",
        paid_date: new Date().toISOString(),
        payment_method: paymentRef.method,
        payment_reference: paymentRef.reference,
        status_history: history,
      });
      queryClient.invalidateQueries({ queryKey: ["expense-approval-queue"] });
      toast({ title: "Marked as paid" });
      base44.functions.invoke("expense-notify", { event: "paid", reportId: report.id }).catch(() => {});
      onUpdated?.();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Something went wrong", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const canAct = ["submitted", "in_review"].includes(report.status);
  const isSelfApproval = report.submitter_id === reviewer?.id;
  const canMarkPaid = report.status === "approved" || report.status === "exported_to_quickbooks";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {report.title} <ExpenseStatusBadge status={report.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <p><span className="text-muted-foreground">Submitter:</span> {report.submitter_name}</p>
            <p><span className="text-muted-foreground">Report date:</span> {report.report_date}</p>
            <p><span className="text-muted-foreground">Location:</span> {report.location || "—"}</p>
            <p><span className="text-muted-foreground">Submitted total:</span> ${round2(report.submitted_total).toFixed(2)}</p>
          </div>
          {report.purpose && <p className="text-sm text-muted-foreground">{report.purpose}</p>}

          {isSelfApproval && canAct && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              You submitted this report, so you can't approve or reject your own expenses. You can still return it for corrections.
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Line items</Label>
            {lines.map((l) => (
              <div key={l.id} className="rounded-xl border border-border/60 p-3 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-medium">{l.expense_type_name} <span className="text-muted-foreground">· {l.line_date}</span></p>
                    <p className="text-xs text-muted-foreground">{l.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">Submitted: ${round2(l.amount).toFixed(2)}</Badge>
                </div>

                {(l.allocations || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {l.allocations.map((a) => (
                      <Badge key={a.team_id} variant="outline" className="text-[10px]">{a.team_name}: ${round2(a.amount).toFixed(2)}</Badge>
                    ))}
                  </div>
                )}

                {(l.receipts || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {l.receipts.map((r, i) => (
                      <button key={i} type="button" onClick={() => viewReceipt(r)} disabled={receiptLoading[r.file_uri]}
                        className="inline-flex items-center gap-1 text-[11px] bg-background rounded px-2 py-1 border border-border/40 hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50">
                        {receiptLoading[r.file_uri] ? <span className="animate-pulse">Opening…</span> : <><Eye className="w-3 h-3" /> {r.file_name} <ExternalLink className="w-2.5 h-2.5 opacity-50" /></>}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-2 items-end">
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Approved amount</Label>
                    <Input type="number" step="0.01" disabled={!canAct} value={l.approved_amount ?? ""} onChange={(e) => updateLineField(l.id, "approved_amount", Number(e.target.value) || 0)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Comment</Label>
                    <Input disabled={!canAct} value={l.approver_comment || ""} onChange={(e) => updateLineField(l.id, "approver_comment", e.target.value)} className="h-8 text-sm" placeholder="Optional note on this line" />
                  </div>
                </div>
                {canAct && (
                  <button type="button" onClick={() => updateLineField(l.id, "flagged", !l.flagged)} className={`inline-flex items-center gap-1 text-[11px] ${l.flagged ? "text-red-600" : "text-muted-foreground"}`}>
                    <Flag className="w-3 h-3" /> {l.flagged ? "Flagged" : "Flag for attention"}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <span className="text-sm text-muted-foreground">Approved total</span>
            <span className="text-lg font-extrabold">${approvedTotal.toFixed(2)}</span>
          </div>

          {canAct && (
            <div>
              <Label className="text-xs">Reason for returning <span className="text-red-500">*</span></Label>
              <Textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className="min-h-[60px]" placeholder="e.g. Please attach receipts and add the missing team" />
            </div>
          )}

          {canMarkPaid && (
            <div className="grid sm:grid-cols-2 gap-2 rounded-lg bg-teal-50 border border-teal-200 p-3">
              <div>
                <Label className="text-xs">Payment method</Label>
                <Input value={paymentRef.method} onChange={(e) => setPaymentRef({ ...paymentRef, method: e.target.value })} placeholder="ACH, check, QuickBooks…" />
              </div>
              <div>
                <Label className="text-xs">Reference</Label>
                <Input value={paymentRef.reference} onChange={(e) => setPaymentRef({ ...paymentRef, reference: e.target.value })} placeholder="Check #, transaction id…" />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          {canAct && (
            <Button variant="outline" disabled={saving} className="gap-1.5 text-orange-600 border-orange-200" onClick={() => transition("returned", { return_reason: returnReason })}>
              <Undo2 className="w-4 h-4" /> Return for changes
            </Button>
          )}
          {canAct && !isSelfApproval && (
            <>
              <Button variant="outline" disabled={saving} className="gap-1.5 text-red-600 border-red-200" onClick={() => transition("rejected", { return_reason: returnReason })}>
                <XCircle className="w-4 h-4" /> Reject
              </Button>
              <Button disabled={saving} className="gap-1.5" onClick={() => transition("approved")}>
                <CheckCircle2 className="w-4 h-4" /> Approve
              </Button>
            </>
          )}
          {canMarkPaid && (
            <Button disabled={saving} className="gap-1.5" onClick={markPaid}>
              <DollarSign className="w-4 h-4" /> Mark as paid
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}