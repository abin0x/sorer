import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";

const money = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n) || 0);

/** Echelon card entry. The form posts straight to the processor, never to us. */
export default function EchelonPay() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const orderId = params.get("order") || "";
  const tokenId = params.get("token-id") || "";
  const [state, setState] = useState({ loading: true, order: null, error: "" });

  useEffect(() => {
    const run = async () => {
      try {
        const res = await base44.functions.invoke("echelon-complete", { action: tokenId ? "complete" : "form", order_id: orderId, token_id: tokenId || undefined });
        if (tokenId && res.data?.status === "paid") {
          window.location.replace(`/MarketplaceCart?step=confirmation&order=${encodeURIComponent(orderId)}`);
          return;
        }
        setState({ loading: false, order: res.data, error: "" });
      } catch (e) {
        setState({ loading: false, order: null, error: e?.message || "This payment link isn't valid." });
      }
    };
    run();
  }, [orderId, tokenId]);

  if (state.loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const o = state.order;
  const formUrl = o?.form_url && /^https:\/\//.test(o.form_url) ? o.form_url : "";
  return (
    <div className="max-w-md mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pay securely</h1>
        {o && <p className="text-sm text-muted-foreground">Order {o.order_number} · {money(o.total)}</p>}
      </div>
      {state.error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p>}
      {o?.items?.length > 0 && (
        <ul className="rounded-lg border divide-y text-sm">
          {o.items.map((i, idx) => <li key={idx} className="flex justify-between p-3"><span>{i.name}</span><span>{money(i.line_total)}</span></li>)}
        </ul>
      )}
      {o && o.status === "paid" && <p className="text-sm">This order is already paid. Thank you!</p>}
      {formUrl ? (
        <form method="POST" action={formUrl} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="cc">Card number</Label><Input id="cc" name="billing-cc-number" inputMode="numeric" autoComplete="cc-number" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="exp">Expiry (MMYY)</Label><Input id="exp" name="billing-cc-exp" inputMode="numeric" autoComplete="cc-exp" placeholder="0828" maxLength={4} required /></div>
            <div className="space-y-1.5"><Label htmlFor="cvv">Security code</Label><Input id="cvv" name="cvv" inputMode="numeric" autoComplete="cc-csc" maxLength={4} required /></div>
          </div>
          <Button type="submit" className="w-full h-12 text-base"><Lock className="w-4 h-4 mr-2" />Pay {money(o.total)}</Button>
          <p className="text-xs text-muted-foreground text-center">Your card details go straight to the club's processor, Echelon.</p>
        </form>
      ) : o && o.status !== "paid" && !state.error ? (
        <p className="text-sm text-muted-foreground">This payment can no longer be completed. Please start again from the club's page.</p>
      ) : null}
    </div>
  );
}
