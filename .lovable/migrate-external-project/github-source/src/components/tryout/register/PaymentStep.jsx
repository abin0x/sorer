import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Tag, HandCoins, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { checkPromo, money } from "@/lib/tryoutRegisterApi";

/** Step 4 — the money: fees per player, a promo or waived-fee code, a
 *  financial-aid request, and one payment for the whole family. */
export default function PaymentStep({ clubId, family, selected, choices, promo, setPromo, aid, setAid, aidNote, setAidNote, submitting, onSubmit, refundPolicy }) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const planById = {};
  (family?.plans || []).forEach((p) => { planById[p.id] = p; });

  const rows = selected.map((kid) => {
    const choice = choices[kid.id] || {};
    const plan = planById[choice.plan_id];
    const session = plan?.sessions.find((s) => s.id === choice.event_id);
    return { kid, plan, session, fee: Number(plan?.tryout_fee || 0), waitlist: !!session?.waitlist };
  });
  const subtotal = rows.reduce((s, r) => s + (r.waitlist ? 0 : r.fee), 0);
  const discount = Math.min(promo?.discount || 0, subtotal);
  const total = aid ? 0 : Math.max(0, subtotal - discount);

  const applyCode = async () => {
    if (!code.trim()) return;
    setChecking(true);
    try {
      const res = await checkPromo(clubId, code.trim(), subtotal);
      if (!res.valid) { toast.error(res.message); setPromo(null); return; }
      setPromo({ code: res.code, discount: res.discount });
      toast.success(res.message);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-6 space-y-3">
          <h2 className="font-bold text-lg">What you owe</h2>
          <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
            {rows.map((r) => (
              <div key={r.kid.id} className="p-3.5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{r.kid.first_name} {r.kid.last_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.plan?.title} · {r.session?.date}{r.session?.start_time ? ` at ${r.session.start_time}` : ""}
                  </p>
                  {r.waitlist && <Badge className="bg-amber-100 text-amber-700 text-[10px] mt-1">Waitlist — no fee due today</Badge>}
                </div>
                <span className="text-sm font-semibold">{r.waitlist ? "—" : money(r.fee)}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <div className="flex-1">
              <Label className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Promo or fee-waiver code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="OPTIONAL" className="rounded-xl" />
            </div>
            <Button variant="outline" onClick={applyCode} disabled={checking || !code.trim()} className="sm:mt-6 sm:w-28">
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
            </Button>
          </div>
          {promo && (
            <p className="text-xs text-emerald-700 flex items-center gap-1.5">
              <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{promo.code}</Badge>
              {money(discount)} off
            </p>
          )}

          <label className="flex items-start gap-3 border border-border rounded-xl p-3.5 cursor-pointer hover:border-primary/40">
            <Checkbox checked={aid} onCheckedChange={(v) => setAid(!!v)} className="mt-0.5" />
            <span>
              <span className="text-sm font-medium flex items-center gap-1.5"><HandCoins className="w-4 h-4 text-primary" /> Request financial aid</span>
              <span className="block text-xs text-muted-foreground">
                No payment is taken now. The club reviews your request and confirms the fee before the tryout.
              </span>
            </span>
          </label>
          {aid && (
            <Textarea
              value={aidNote} onChange={(e) => setAidNote(e.target.value)} rows={3}
              placeholder="Anything the club should know (optional)"
              className="rounded-xl"
            />
          )}

          <div className="border-t border-border pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{money(subtotal)}</span></div>
            {discount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount</span><span>-{money(discount)}</span></div>}
            <div className="flex justify-between font-semibold text-base"><span>Total due today</span><span>{money(total)}</span></div>
          </div>
          {refundPolicy && <p className="text-xs text-muted-foreground">Refunds: {refundPolicy}</p>}
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
            <p className="text-sm text-muted-foreground">
              {total > 0
                ? "You will be taken to the club's secure Stripe checkout. One payment covers every player above."
                : "Nothing to pay today — we will send your confirmation straight away."}
            </p>
          </div>
          <Button onClick={onSubmit} disabled={submitting} className="w-full h-11 rounded-xl">
            {submitting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Working…</>
              : total > 0 ? <><CreditCard className="w-4 h-4 mr-2" /> Pay {money(total)} and register</> : "Complete registration"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}