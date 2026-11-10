import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  "paid_in_full", "active", "pending_setup", "past_due", "payment_failed", "on_hold", "waived", "refunded", "cancelled",
];

export default function RecordPaymentDialog({ open, onOpenChange, source, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const { data: processors = [] } = useQuery({
    queryKey: ["payment-processors-active"],
    queryFn: () => base44.entities.PaymentProcessor.filter({ is_active: true }, "-is_default", 50),
    enabled: open,
  });

  useEffect(() => {
    if (open && source) {
      const def = processors.find((p) => p.is_default) || processors[0];
      setForm({
        amount: source.defaultAmount || "",
        processor_id: def?.id || "",
        payment_method: "card",
        status: "paid_in_full",
        transaction_reference: "",
        payment_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
    }
  }, [open, source, processors]);

  if (!source) return null;

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      const processor = processors.find((p) => p.id === form.processor_id);
      const user = await base44.auth.me().catch(() => null);
      const payment = await base44.entities.Payment.create({
        source_type: source.type,
        source_id: source.id,
        source_label: source.label,
        player_id: source.player_id,
        player_name: source.player_name,
        guardian_name: source.guardian_name,
        amount: Number(form.amount),
        currency: "USD",
        processor_id: processor?.id || "",
        processor_name: processor?.display_name || "Manual",
        payment_method: form.payment_method,
        status: form.status,
        transaction_reference: form.transaction_reference,
        payment_date: form.payment_date,
        recorded_by: user?.email,
        notes: form.notes,
      });
      toast.success("Payment recorded");
      onOpenChange(false);
      if (onSaved) await onSaved(payment);
    } catch (e) {
      toast.error("Failed to record payment: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{source.label}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount ($)</Label>
              <Input type="number" value={form.amount || ""} onChange={(e) => handleChange("amount", e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <Label className="text-xs">Payment Date</Label>
              <Input type="date" value={form.payment_date || ""} onChange={(e) => handleChange("payment_date", e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Processor</Label>
            <Select value={form.processor_id} onValueChange={(v) => handleChange("processor_id", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select processor…" /></SelectTrigger>
              <SelectContent>
                {processors.length === 0 && <SelectItem value="none" disabled>No processors configured</SelectItem>}
                {processors.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name} ({p.processor_type})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Method</Label>
              <Select value={form.payment_method} onValueChange={(v) => handleChange("payment_method", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="ach">ACH / Bank</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Transaction Reference</Label>
            <Input value={form.transaction_reference || ""} onChange={(e) => handleChange("transaction_reference", e.target.value)} className="rounded-xl" placeholder="Confirmation #" />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes || ""} onChange={(e) => handleChange("notes", e.target.value)} className="rounded-xl min-h-[60px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">{saving ? "Saving…" : "Record Payment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}