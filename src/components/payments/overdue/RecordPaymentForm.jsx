import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign } from "lucide-react";
import { money } from "./caseStyles";

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "ach", label: "ACH / bank transfer" },
  { value: "card", label: "Card (taken outside the app)" },
  { value: "other", label: "Other" },
];

/** Records money the club actually received, applying it to the oldest missed charges. */
export default function RecordPaymentForm({ caseRecord, onSubmit, busy }) {
  const [amount, setAmount] = useState(String(caseRecord.amount_outstanding || ""));
  const [method, setMethod] = useState("cash");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const amountValue = Number(amount || 0);
  const coversAll = amountValue >= Number(caseRecord.amount_outstanding || 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Amount received ($)</Label>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-xl" />
        </div>
        <div>
          <Label className="text-xs">Date received</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Method</Label>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Note (optional)</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl min-h-[60px]" placeholder="Check number, who handed it in…" />
      </div>

      <p className="text-xs text-muted-foreground">
        {coversAll
          ? `This clears the whole ${money(caseRecord.amount_outstanding)} balance and closes the case.`
          : `Applies to the oldest missed payments first — ${money(Number(caseRecord.amount_outstanding || 0) - amountValue)} would stay outstanding.`}
      </p>
      <p className="text-xs text-muted-foreground">
        The payment is written to the ledger and the family&apos;s balance is updated.
      </p>

      <Button
        className="w-full rounded-xl"
        disabled={busy || !(amountValue > 0)}
        onClick={() => onSubmit({ amount: amountValue, payment_method: method, payment_date: date, notes })}
      >
        {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <DollarSign className="w-4 h-4 mr-1.5" />}
        Record payment
      </Button>
    </div>
  );
}