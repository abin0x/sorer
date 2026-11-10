import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CreditCard, RotateCcw, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Admin tools: record an offline (cash/check) payment or refund a payment. */
export default function PaymentAdminTools({ onDone }) {
  const { toast } = useToast();
  const [tab, setTab] = useState("offline");
  const [busy, setBusy] = useState(false);

  // offline payment form
  const [oSourceType, setOSourceType] = useState("registration");
  const [oSourceId, setOSourceId] = useState("");
  const [oAmount, setOAmount] = useState("");
  const [oMethod, setOMethod] = useState("cash");
  const [oDate, setODate] = useState(new Date().toISOString().split("T")[0]);
  const [oNotes, setONotes] = useState("");

  // refund form
  const [rPaymentId, setRPaymentId] = useState("");
  const [rAmount, setRAmount] = useState("");
  const [rNotes, setRNotes] = useState("");

  const recordOffline = async () => {
    if (!oSourceId || !oAmount) { toast({ title: "Source ID and amount are required", variant: "destructive" }); return; }
    setBusy(true);
    try {
      await base44.functions.invoke("record-offline-payment", {
        source_type: oSourceType,
        source_id: oSourceId,
        amount: Number(oAmount),
        payment_method: oMethod,
        payment_date: oDate,
        notes: oNotes,
      });
      toast({ title: "Offline payment recorded", description: `$${oAmount} via ${oMethod}.` });
      setOSourceId(""); setOAmount(""); setONotes("");
      onDone?.();
    } catch (e) {
      toast({ title: "Failed to record", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    }
    setBusy(false);
  };

  const refund = async () => {
    if (!rPaymentId || !rAmount) { toast({ title: "Payment ID and amount are required", variant: "destructive" }); return; }
    if (!window.confirm(`Refund $${rAmount} for payment ${rPaymentId}?`)) return;
    setBusy(true);
    try {
      await base44.functions.invoke("process-refund", {
        payment_id: rPaymentId,
        amount: Number(rAmount),
        notes: rNotes,
      });
      toast({ title: "Refund processed", description: `$${rAmount} refunded.` });
      setRPaymentId(""); setRAmount(""); setRNotes("");
      onDone?.();
    } catch (e) {
      toast({ title: "Refund failed", description: e?.response?.data?.error || e?.message, variant: "destructive" });
    }
    setBusy(false);
  };

  return (
    <Card className="adisal-card">
      <CardContent className="p-5 space-y-4">
        <div className="flex gap-2">
          <Button size="sm" variant={tab === "offline" ? "default" : "outline"} onClick={() => setTab("offline")}>
            <Landmark className="w-3.5 h-3.5 mr-1.5" /> Record Offline Payment
          </Button>
          <Button size="sm" variant={tab === "refund" ? "default" : "outline"} onClick={() => setTab("refund")}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Process Refund
          </Button>
        </div>

        {tab === "offline" ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Source Type</Label>
              <Select value={oSourceType} onValueChange={setOSourceType}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="registration">Season Registration</SelectItem>
                  <SelectItem value="tryout_event">Tryout Final Registration</SelectItem>
                  <SelectItem value="club_event">Event Registration</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Source Record ID</Label>
              <Input placeholder="e.g. rec_abc123" value={oSourceId} onChange={(e) => setOSourceId(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount ($)</Label>
              <Input type="number" min="0" step="0.01" placeholder="150.00" value={oAmount} onChange={(e) => setOAmount(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Method</Label>
              <Select value={oMethod} onValueChange={setOMethod}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Date</Label>
              <Input type="date" value={oDate} onChange={(e) => setODate(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Input placeholder="Check #1234" value={oNotes} onChange={(e) => setONotes(e.target.value)} className="rounded-xl" />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={recordOffline} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700">
                {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
                Record Payment
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Payment Ledger ID</Label>
              <Input placeholder="e.g. pay_abc123" value={rPaymentId} onChange={(e) => setRPaymentId(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Refund Amount ($)</Label>
              <Input type="number" min="0" step="0.01" placeholder="150.00" value={rAmount} onChange={(e) => setRAmount(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Reason / Notes</Label>
              <Input placeholder="Player withdrew from program" value={rNotes} onChange={(e) => setRNotes(e.target.value)} className="rounded-xl" />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={refund} disabled={busy} variant="destructive">
                {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1.5" />}
                Process Refund
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}