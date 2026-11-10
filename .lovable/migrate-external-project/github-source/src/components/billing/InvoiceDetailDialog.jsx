import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CreditCard, Send, RefreshCw, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { apiError, billingApi, money, portalApi } from "@/lib/facilityBillingApi";
import InvoiceStatusBadge from "./InvoiceStatusBadge";

export default function InvoiceDetailDialog({ open, onOpenChange, invoiceId, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [payment, setPayment] = useState({ amount: "", method: "check", reference: "", paid_at: "" });

  const load = React.useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const res = await billingApi({ action: "invoice_detail", invoice_id: invoiceId });
      setData(res);
      setPayment((p) => ({ ...p, amount: "" }));
    } catch (error) {
      toast.error(apiError(error, "Could not load this invoice."));
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  React.useEffect(() => {
    if (open && invoiceId) {
      setShowPayment(false);
      load();
    }
  }, [open, invoiceId, load]);

  const invoice = data?.invoice;
  const balance = invoice ? Number(invoice.balance ?? invoice.total ?? 0) : 0;

  const run = async (label, fn) => {
    setBusy(label);
    try {
      await fn();
    } catch (error) {
      toast.error(apiError(error, "That did not work."));
    } finally {
      setBusy("");
    }
  };

  const markSent = () =>
    run("sent", async () => {
      await billingApi({ action: "mark_sent", invoice_id: invoiceId });
      toast.success("Invoice marked as sent.");
      await load();
      onChanged?.();
    });

  const recordPayment = () => {
    const amount = Number(payment.amount || balance);
    if (!(amount > 0)) return toast.error("Enter an amount greater than zero.");
    return run("payment", async () => {
      await billingApi({
        action: "record_payment",
        invoice_id: invoiceId,
        amount,
        method: payment.method,
        reference: payment.reference,
        paid_at: payment.paid_at || undefined,
      });
      toast.success("Payment recorded, and posted to bookkeeping.");
      setShowPayment(false);
      setPayment({ amount: "", method: "check", reference: "", paid_at: "" });
      await load();
      onChanged?.();
    });
  };

  const payByCard = () =>
    run("card", async () => {
      const res = await portalApi({ action: "create_checkout", invoice_id: invoiceId });
      if (res?.url) window.location.href = res.url;
      else toast.error(res?.error || "Could not start a card payment.");
    });

  const checkStripe = () =>
    run("stripe", async () => {
      const res = await portalApi({ action: "sync_stripe_payment", invoice_id: invoiceId });
      if (res?.paid) {
        toast.success(res.already_recorded ? "Payment was already recorded." : "Card payment recorded.");
        await load();
        onChanged?.();
      } else {
        toast.info(res?.reason || "No card payment found for this invoice yet.");
      }
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {invoice ? invoice.invoice_number : "Invoice"}
            {invoice && <InvoiceStatusBadge status={invoice.status} />}
          </DialogTitle>
        </DialogHeader>

        {loading && !invoice ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : invoice ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Organization</p>
                <p className="font-medium">{invoice.billing_entity_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Period</p>
                <p className="font-medium">{invoice.period_label || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Due</p>
                <p className="font-medium">{invoice.due_date || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="font-medium">{money(balance, invoice.currency)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-3 py-2 bg-muted text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {data.lines?.length || 0} bookings · {money(invoice.total, invoice.currency)} total
              </div>
              <div className="divide-y divide-border max-h-64 overflow-y-auto">
                {(data.lines || []).map((line) => (
                  <div key={line.id} className="px-3 py-2 flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {line.booking_date} · {line.field_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {line.details || line.description}
                        {line.start_time ? ` · ${line.start_time}–${line.end_time}` : ""}
                        {line.hours ? ` · ${line.hours} hrs` : ""}
                      </p>
                    </div>
                    <span className="font-medium whitespace-nowrap">{money(line.amount, invoice.currency)}</span>
                  </div>
                ))}
                {(data.lines || []).length === 0 && (
                  <p className="px-3 py-4 text-sm text-muted-foreground">No bookings on this invoice.</p>
                )}
              </div>
            </div>

            {(data.payments || []).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Payments</p>
                <div className="space-y-1">
                  {data.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {(p.paid_at || p.created_date || "").slice(0, 10)} · {p.method}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </span>
                      <span className="font-medium">{money(p.amount, invoice.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showPayment && (
              <div className="rounded-xl border border-border p-3 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={payment.amount}
                      onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                      placeholder={String(balance.toFixed(2))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Method</Label>
                    <Select value={payment.method} onValueChange={(v) => setPayment({ ...payment, method: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="ach">ACH</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Reference</Label>
                    <Input
                      value={payment.reference}
                      onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
                      placeholder="Check #"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Date received</Label>
                    <Input
                      type="date"
                      value={payment.paid_at}
                      onChange={(e) => setPayment({ ...payment, paid_at: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {invoice && invoice.status === "draft" && (
              <Button variant="outline" onClick={markSent} disabled={!!busy}>
                {busy === "sent" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                Mark as sent
              </Button>
            )}
            {invoice && balance > 0 && (
              <>
                <Button variant="outline" onClick={checkStripe} disabled={!!busy}>
                  {busy === "stripe" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-1" />
                  )}
                  Check card payment
                </Button>
                <Button variant="outline" onClick={payByCard} disabled={!!busy}>
                  {busy === "card" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-1" />
                  )}
                  Pay by card
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {invoice && balance > 0 && !showPayment && (
              <Button onClick={() => setShowPayment(true)}>
                <DollarSign className="w-4 h-4 mr-1" /> Record payment
              </Button>
            )}
            {showPayment && (
              <Button onClick={recordPayment} disabled={!!busy}>
                {busy === "payment" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save payment"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}