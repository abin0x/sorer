import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { money, SESSION_LABEL, statusMeta, REG_STATUS, PAYMENT_STATUS, WAIVER_STATUS } from "@/lib/tryoutRegisterApi";
import { RefreshCw, HandCoins, XCircle, Receipt, BadgeCheck, Undo2 } from "lucide-react";

/** One family registration, with the actions an admin actually needs:
 *  record an offline payment, waive a fee, decide an aid request, move or
 *  cancel a spot, and issue the refund that applies. */
export default function RegistrationDetailDialog({ registration: r, plan, events = [], clubId, canManage, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [targetSession, setTargetSession] = useState("");

  const reg = statusMeta(REG_STATUS, r.status);
  const pay = statusMeta(PAYMENT_STATUS, r.payment_status);
  const waiver = statusMeta(WAIVER_STATUS, r.waiver_status);
  const outstanding = money(Number(r.amount_due || 0) - Number(r.amount_paid || 0));

  const call = async (payload, message) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("tryout-registration", payload);
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(message);
      onChanged();
      if (payload.action !== "admin_move") onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const refund = async () => {
    const amount = Number(r.refund_amount || r.amount_paid || 0);
    if (!(amount > 0)) { toast.error("There is nothing to refund on this registration."); return; }
    if (!window.confirm(`Refund ${money(amount)} to ${r.guardian_email || "the family"}?`)) return;
    setBusy(true);
    try {
      const payments = await base44.entities.Payment.filter({ source_id: r.id, source_type: "tryout_registration" }).catch(() => []);
      const payment = (payments || []).find((p) => !p.is_refund);
      if (!payment) throw new Error("No payment was found in the ledger for this fee.");
      const res = await base44.functions.invoke("process-refund", {
        payment_id: payment.id, amount, notes: note || `Tryout fee refund — ${r.player_name}`,
      });
      if (res.data?.error) throw new Error(res.data.error);
      await base44.functions.invoke("tryout-registration", {
        action: "admin_refund_recorded", registration_id: r.id, amount,
        note: note || `Refunded by ${"admin"}`,
      });
      toast.success(`${money(amount)} refunded`);
      onChanged();
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const move = () => {
    if (!targetSession) { toast.error("Pick the session to move this player to."); return; }
    call({ action: "admin_move", registration_id: r.id, event_id: targetSession }, "Player moved to the new session");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{r.player_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge className={reg.className}>{reg.label}</Badge>
            <Badge className={pay.className}>{pay.label}</Badge>
            <Badge className={waiver.className}>{waiver.label}</Badge>
            {r.pool_status && <Badge variant="outline">Pool: {r.pool_status}</Badge>}
            {r.refund_status === "due" && <Badge className="bg-amber-100 text-amber-700">Refund due {money(r.refund_amount)}</Badge>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tryout</p>
              <p>{plan?.title || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Session</p>
              <p>{r.session_date || "—"}{r.session_start_time ? ` ${r.session_start_time}` : ""}{r.session_field_name ? ` · ${r.session_field_name}` : ""}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Family</p>
              <p>{r.guardian_name} · {r.guardian_email}</p>
              {r.guardian_phone && <p className="text-xs text-muted-foreground">{r.guardian_phone}</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Eligibility</p>
              <p>{r.desired_age_group || "—"}{r.player_date_of_birth ? ` · born ${r.player_date_of_birth}` : ""}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fee</p>
              <p>
                {money(r.fee_amount)}
                {r.discount_amount > 0 ? ` − ${money(r.discount_amount)}${r.promo_code ? ` (${r.promo_code})` : ""}` : ""}
                {r.amount_paid > 0 ? ` · ${money(r.amount_paid)} paid` : ""}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Check-in code</p>
              <p className="font-mono font-semibold">{r.check_in_code || "—"}</p>
            </div>
          </div>

          {r.waiver_status === "signed" && (
            <div className="text-xs text-muted-foreground border border-border rounded-xl p-3">
              <p className="font-medium text-foreground">Signed by {r.waiver_signature || r.waiver_signed_by}</p>
              <p>{r.waiver_signed_by} · {r.waiver_signed_at ? String(r.waiver_signed_at).slice(0, 16).replace("T", " ") : ""}</p>
              {(r.waiver_documents || []).length > 0 && (
                <p className="mt-1">Accepted: {r.waiver_documents.filter((d) => d.accepted).map((d) => d.name).join(", ") || "none"}</p>
              )}
            </div>
          )}

          {r.financial_aid_requested && (
            <div className="text-xs border border-indigo-200 bg-indigo-50 rounded-xl p-3 text-indigo-900">
              <p className="font-medium">Financial aid · {r.financial_aid_status}</p>
              {r.financial_aid_note && <p className="mt-0.5 whitespace-pre-wrap">{r.financial_aid_note}</p>}
            </div>
          )}

          {(r.reschedule_history || []).length > 0 && (
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Session changes</p>
              {r.reschedule_history.map((h, i) => (
                <p key={i}>{String(h.at).slice(0, 10)} · {h.from_date || "—"} → {h.to_date} ({h.by})</p>
              ))}
            </div>
          )}

          {canManage ? (
            <div className="space-y-3 border-t border-border pt-4">
              <div>
                <Label>Note (optional)</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this change was made" />
              </div>

              <div className="flex flex-wrap gap-2">
                {outstanding > 0 && (
                  <>
                    <Select value={method} onValueChange={setMethod}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="ach">ACH</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input className="w-40" placeholder="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
                    <Button disabled={busy} onClick={() => call({
                      action: "admin_mark_paid", registration_id: r.id, method, reference, note,
                    }, `Payment of ${outstanding} recorded`)}>
                      <Receipt className="w-4 h-4 mr-1.5" /> Record {outstanding}
                    </Button>
                  </>
                )}
                <Button variant="outline" disabled={busy} onClick={() => call({ action: "admin_waive", registration_id: r.id, note }, "Fee waived")}>
                  <BadgeCheck className="w-4 h-4 mr-1.5" /> Waive fee
                </Button>
                {r.financial_aid_status === "requested" && (
                  <>
                    <Button disabled={busy} onClick={() => call({ action: "admin_financial_aid", registration_id: r.id, decision: "approved", note }, "Financial aid approved")}>Approve aid</Button>
                    <Button variant="outline" disabled={busy} onClick={() => call({ action: "admin_financial_aid", registration_id: r.id, decision: "declined", note }, "Financial aid declined")}>Decline aid</Button>
                  </>
                )}
                {(r.refund_status === "due" || Number(r.amount_paid || 0) > 0) && (
                  <Button variant="outline" disabled={busy} onClick={refund}>
                    <Undo2 className="w-4 h-4 mr-1.5" /> Refund {money(r.refund_amount || r.amount_paid)}
                  </Button>
                )}
                {r.status !== "cancelled" && (
                  <Button variant="ghost" className="text-destructive hover:text-destructive" disabled={busy} onClick={() => {
                    if (window.confirm(`Cancel ${r.player_name}'s spot?`)) {
                      call({ action: "admin_cancel", registration_id: r.id, reason: note || "Cancelled by the club" }, "Spot cancelled");
                    }
                  }}>
                    <XCircle className="w-4 h-4 mr-1.5" /> Cancel spot
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[200px]">
                  <Label>Move to another session</Label>
                  <Select value={targetSession} onValueChange={setTargetSession}>
                    <SelectTrigger><SelectValue placeholder="Pick a session" /></SelectTrigger>
                    <SelectContent>
                      {events.filter((e) => e.id !== r.tryout_event_id).map((e) => (
                        <SelectItem key={e.id} value={e.id}>{SESSION_LABEL[e.type] || "Session"} — {e.date}{e.start_time ? ` ${e.start_time}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" disabled={busy || !targetSession} onClick={move}>
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Move
                </Button>
              </div>

              {r.financial_aid_requested && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <HandCoins className="w-3.5 h-3.5" /> Approving aid waives the fee and confirms the spot.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground border-t border-border pt-4">
              Only club and branch admins can change this registration.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}