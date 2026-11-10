import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { remindFamilies } from "@/lib/tryoutDashboard";

const OWING = ["unpaid", "pending", "failed", "partially_paid"];

/** Nudges the families an admin ticked about the paperwork or fee still open. */
export default function RemindDialog({ regs, onClose, onDone }) {
  const [kind, setKind] = useState("all");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const waiver = regs.filter((r) => r.waiver_status !== "signed").length;
  const payment = regs.filter((r) => OWING.includes(r.payment_status)).length;
  const nothing = !waiver && !payment;

  const send = async () => {
    setBusy(true);
    try {
      const res = await remindFamilies({ registration_ids: regs.map((r) => r.id), kind, message });
      const parts = [`${res.sent} reminder${res.sent === 1 ? "" : "s"} sent`];
      if (res.failed) parts.push(`${res.failed} skipped (nothing outstanding or no email)`);
      toast.success(parts.join(" · "));
      onDone();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Remind {regs.length} famil{regs.length === 1 ? "y" : "ies"}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-amber-100 text-amber-700">{waiver} with paperwork outstanding</Badge>
            <Badge className="bg-rose-100 text-rose-700">{payment} with a fee due</Badge>
          </div>

          <div>
            <Label>What to remind them about</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everything still outstanding</SelectItem>
                <SelectItem value="waiver">Paperwork only</SelectItem>
                <SelectItem value="payment">Tryout fee only</SelectItem>
                <SelectItem value="custom">Just my message below</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Add your own message (optional)</Label>
            <Textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Anything specific to this group of families"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Each family gets one email plus an in-app notification, with a link to their registration page.
            {nothing && kind !== "custom" && " Nobody in this selection is missing anything, so there may be nothing to send."}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={send}>{busy ? "Sending…" : "Send reminders"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}