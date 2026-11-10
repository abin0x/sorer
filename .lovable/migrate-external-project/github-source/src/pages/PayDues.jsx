import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, ShieldCheck } from "lucide-react";
import PublicFooter from "@/components/public/PublicFooter";
import ResponsiveSelect from "@/components/shared/ResponsiveSelect";

export default function PayDues() {
  const [searchParams] = useSearchParams();
  const offerId = searchParams.get("offer");
  const clubSlug = searchParams.get("club");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [email, setEmail] = useState("");
  const [paymentPlan, setPaymentPlan] = useState("full");

  useEffect(() => {
    if (!offerId) { setError("Missing dues link."); setLoading(false); return; }
    base44.functions.invoke("get-dues-offer", { offer_id: offerId })
      .then((r) => {
        setData(r.data);
        const plans = r.data?.offer?.config?.payment_plans || ["full"];
        setPaymentPlan(plans[0]);
      })
      .catch((e) => setError(e?.response?.data?.error || "Could not load dues info"))
      .finally(() => setLoading(false));
  }, [offerId]);

  const handlePay = async () => {
    if (!playerName || !email) return;
    setPaying(true);
    try {
      const r = await base44.functions.invoke("create-offer-checkout", {
        club_slug: clubSlug || undefined,
        items: [{ offer_id: offerId, type: "dues", payment_plan: paymentPlan, player: { name: playerName }, quantity: 1 }],
        customer: { name: playerName, email },
      });
      if (r.data?.checkout_url) window.location.href = r.data.checkout_url;
      else setError("Could not start checkout.");
    } catch (e) {
      setError(e?.response?.data?.error || "Payment failed.");
    }
    setPaying(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="text-center max-w-sm">
        <p className="text-lg font-semibold text-slate-900">{error}</p>
        <p className="text-sm text-slate-500 mt-2">Please contact your club directly.</p>
      </div>
    </div>
  );

  const config = data?.offer?.config || {};
  const amount = Number(config.amount || 0);
  const plans = config.payment_plans || ["full"];

  return (
    <div className="safe-top min-h-screen bg-slate-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        {data?.club?.logo_url && (
          <img src={data.club.logo_url} alt={data.club.name} className="w-16 h-16 rounded-lg mx-auto mb-4 object-contain" />
        )}
        <h1 className="text-xl font-bold text-center text-slate-900">{data?.offer?.name}</h1>
        <p className="text-center text-sm text-slate-500 mt-1">{data?.club?.name}</p>

        <div className="text-center my-6">
          <p className="text-4xl font-bold text-slate-900">${amount.toFixed(2)}</p>
          <p className="text-sm text-slate-500 mt-1">yearly club dues</p>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Player Name</Label>
            <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Player full name" />
          </div>
          <div>
            <Label className="text-xs">Email Address</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          {plans.length > 1 && (
            <div>
              <Label className="text-xs">Payment Plan</Label>
              <ResponsiveSelect
                className="w-full h-10 mt-1"
                value={paymentPlan}
                onChange={setPaymentPlan}
                label="Payment plan"
                options={[
                  ...(plans.includes("full") ? [{ value: "full", label: "Pay in Full" }] : []),
                  ...(plans.includes("monthly") ? [{ value: "monthly", label: "Monthly Installments" }] : []),
                  ...(plans.includes("split_guardians") ? [{ value: "split_guardians", label: "Split Between Guardians" }] : []),
                ]}
              />
            </div>
          )}
        </div>

        <Button onClick={handlePay} disabled={paying || !playerName || !email} className="w-full mt-5 h-12 text-base">
          {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5 mr-2" />}
          Pay ${amount.toFixed(2)}
        </Button>

        <p className="text-xs text-slate-400 text-center mt-4 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Secure payment via Stripe
        </p>
      </div>
      <PublicFooter />
    </div>
  );
}