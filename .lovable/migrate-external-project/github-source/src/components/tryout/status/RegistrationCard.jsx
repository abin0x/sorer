import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, MapPin, Clock, HandCoins, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { SESSION_LABEL, money, cancelRegistration, requestFinancialAid, statusMeta, REG_STATUS, PAYMENT_STATUS, WAIVER_STATUS } from "@/lib/tryoutRegisterApi";
import RescheduleDialog from "@/components/tryout/status/RescheduleDialog";

/** One registration, as the family sees it: status, payment, paperwork,
 *  any refund that applies, and the actions still inside the window. */
export default function RegistrationCard({ registration, email, onChanged }) {
  const [showMove, setShowMove] = useState(false);
  const [showAid, setShowAid] = useState(false);
  const [aidNote, setAidNote] = useState("");
  const [busy, setBusy] = useState(false);

  const r = registration;
  const reg = statusMeta(REG_STATUS, r.status);
  const pay = statusMeta(PAYMENT_STATUS, r.payment_status);
  const waiver = statusMeta(WAIVER_STATUS, r.waiver_status);

  const cancel = async () => {
    const refundText = r.refund_on_cancel?.due
      ? `A refund of ${money(r.refund_on_cancel.amount)} applies.`
      : "No refund applies for this cancellation.";
    if (!window.confirm(`Cancel ${r.player_name}'s tryout spot? ${refundText}`)) return;
    setBusy(true);
    try {
      const res = await cancelRegistration({ registration_id: r.id, email, reason: "Cancelled by the family" });
      toast.success(res.refund?.due ? `Cancelled — ${money(res.refund.amount)} refund is on its way` : "Registration cancelled");
      onChanged();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const askForAid = async () => {
    setBusy(true);
    try {
      await requestFinancialAid({ registration_ids: [r.id], email, note: aidNote });
      toast.success("Financial aid requested — the club will review it");
      setShowAid(false);
      onChanged();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const canAskForAid = ["unpaid", "pending", "failed"].includes(r.payment_status) && r.financial_aid_status !== "requested"
    && r.financial_aid_status !== "approved" && r.status !== "cancelled";

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-semibold">{r.player_name}</p>
            <p className="text-xs text-muted-foreground">{r.plan_title}{r.desired_age_group ? ` · ${r.desired_age_group}` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge className={reg.className}>{reg.label}</Badge>
            <Badge className={pay.className}>{pay.label}</Badge>
            <Badge className={waiver.className}>{waiver.label}</Badge>
          </div>
        </div>

        {r.session && (
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{SESSION_LABEL[r.session.type] || "Session"} · {r.session.date}</span>
            {r.session.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{r.session.start_time}</span>}
            {r.session.field_name && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.session.field_name}</span>}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>
            Fee {money(r.fee_amount)}
            {r.discount_amount > 0 ? ` · discount ${money(r.discount_amount)}${r.promo_code ? ` (${r.promo_code})` : ""}` : ""}
            {r.amount_paid > 0 ? ` · paid ${money(r.amount_paid)}` : ""}
            {r.amount_due > 0 && r.amount_paid < r.amount_due ? ` · ${money(r.amount_due - r.amount_paid)} outstanding` : ""}
          </p>
          {r.financial_aid_requested && <p>Aid request: {r.financial_aid_status}</p>}
          {r.check_in_code && r.status !== "cancelled" && <p>Check-in code <span className="font-mono font-semibold">{r.check_in_code}</span></p>}
        </div>

        {r.refund_status === "due" && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            A refund of {money(r.refund_amount)} applies — the club issues it to your original payment method.
          </p>
        )}
        {r.refund_status === "issued" && (
          <p className="text-xs text-slate-700 bg-slate-50 border border-border rounded-lg p-2.5">
            {money(r.refund_amount)} was refunded{r.refunded_at ? ` on ${String(r.refunded_at).slice(0, 10)}` : ""}.
          </p>
        )}
        {r.change?.deadline && r.status !== "cancelled" && (
          <p className="text-xs text-muted-foreground">
            {r.change.allowed ? `Sessions can be changed until ${r.change.deadline}.` : `The change deadline (${r.change.deadline}) has passed — contact the club.`}
          </p>
        )}
        {r.refund_policy && <p className="text-xs text-muted-foreground">Refunds: {r.refund_policy}</p>}

        {r.status !== "cancelled" && (
          <div className="flex flex-wrap gap-2 pt-1">
            {r.change?.allowed && r.alternative_sessions?.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setShowMove(true)}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Change session
              </Button>
            )}
            {canAskForAid && (
              <Button size="sm" variant="outline" onClick={() => setShowAid((v) => !v)}>
                <HandCoins className="w-3.5 h-3.5 mr-1.5" /> Request financial aid
              </Button>
            )}
            {r.change?.allowed && (
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy} onClick={cancel}>
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel spot
              </Button>
            )}
          </div>
        )}

        {showAid && (
          <div className="border border-border rounded-xl p-3 space-y-2">
            <Textarea rows={3} value={aidNote} onChange={(e) => setAidNote(e.target.value)} placeholder="Anything the club should know (optional)" className="rounded-xl" />
            <div className="flex gap-2">
              <Button size="sm" onClick={askForAid} disabled={busy}>Send request</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAid(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>

      {showMove && (
        <RescheduleDialog
          registration={r}
          email={email}
          onClose={() => setShowMove(false)}
          onChanged={() => { setShowMove(false); onChanged(); }}
        />
      )}
    </Card>
  );
}