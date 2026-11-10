import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, Loader2 } from "lucide-react";
import { money, formatDay } from "./caseStyles";

const OPTIONS = [2, 3, 4, 6, 12];

function defaultFirstDue() {
  return new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
}

/** Arranges installments on the family's registration so the balance gets paid down instead of chased. */
export default function PaymentPlanForm({ caseRecord, onSubmit, busy }) {
  const [installments, setInstallments] = useState("3");
  const [firstDue, setFirstDue] = useState(defaultFirstDue());
  const [note, setNote] = useState("");

  const count = Number(installments);
  const per = Number(caseRecord.amount_outstanding || 0) / count;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Installments</Label>
          <Select value={installments} onValueChange={setInstallments}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n} payments</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">First payment due</Label>
          <Input type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} className="rounded-xl" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Agreement note (optional)</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="rounded-xl min-h-[60px]" placeholder="Agreed by phone with Riley Jones…" />
      </div>

      <p className="text-xs text-muted-foreground">
        {count} monthly payments of <span className="font-semibold">{money(per)}</span>, first due {formatDay(firstDue)}.
        This updates the family&apos;s registration and sets a follow-up for that date.
      </p>

      <Button className="w-full rounded-xl" disabled={busy} onClick={() => onSubmit({ installments: count, first_due_date: firstDue, note })}>
        {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CalendarClock className="w-4 h-4 mr-1.5" />}
        Save payment plan
      </Button>
    </div>
  );
}