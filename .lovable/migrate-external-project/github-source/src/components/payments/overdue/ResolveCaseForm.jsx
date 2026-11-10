import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2 } from "lucide-react";
import { OUTCOME_OPTIONS, money } from "./caseStyles";

const SETTLE_HINTS = {
  payment_received: "The missed charges are marked collected on the ledger.",
  written_off: "The missed charges are marked waived, so they leave the overdue queue.",
  corrected: "The missed charges are cancelled on the ledger.",
};

/** Closes the case with the outcome, so the decision is recorded rather than implied. */
export default function ResolveCaseForm({ caseRecord, onSubmit, busy }) {
  const [outcome, setOutcome] = useState("payment_received");
  const [note, setNote] = useState("");

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Outcome</Label>
        <Select value={outcome} onValueChange={setOutcome}>
          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {OUTCOME_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Why (kept on the case record)</Label>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="rounded-xl min-h-[60px]" placeholder="What was agreed, and with whom…" />
      </div>

      <p className="text-xs text-muted-foreground">
        Closing {money(caseRecord.amount_outstanding)}.
        {SETTLE_HINTS[outcome] ? ` ${SETTLE_HINTS[outcome]}` : " The ledger charges stay past due until they are paid or adjusted."}
      </p>

      <Button className="w-full rounded-xl" disabled={busy} onClick={() => onSubmit({ resolution_type: outcome, note })}>
        {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
        Close case
      </Button>
    </div>
  );
}