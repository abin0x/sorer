import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PlanPicker() {
  const { toast } = useToast();
  const [plans, setPlans] = useState([]);
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [planList, me] = await Promise.all([
          base44.entities.SubscriptionPlan.list("sort_order", 50),
          base44.auth.me(),
        ]);
        setPlans(planList);
        if (me?.club_id) setClub(await base44.entities.Club.get(me.club_id));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const checkout = async (tier) => {
    if (tier === "free") {
      toast({ title: "Free plan", description: "You're on the free plan." });
      return;
    }
    setCheckingOut(tier);
    try {
      const res = await base44.functions.invoke("create-checkout", { productId: tier });
      if (res?.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      } else {
        toast({ title: "Checkout failed", description: "No redirect URL returned", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Checkout failed", description: err?.message || "Try again", variant: "destructive" });
    } finally {
      setCheckingOut(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900">Choose your plan</h1>
          <p className="text-slate-500 mt-2">
            {club ? `${club.name} — currently on ` : ""}<Badge variant="secondary" className="ml-1">{club?.plan_tier || "free"}</Badge>
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = club?.plan_tier === plan.tier;
            const isPro = plan.tier === "pro";
            return (
              <Card key={plan.id} className={isPro ? "border-emerald-400 shadow-lg relative" : ""}>
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-600 text-white"><Sparkles className="w-3 h-3 mr-1" />Most popular</Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold capitalize">{plan.name || plan.tier}</h3>
                  <div className="my-4">
                    <span className="text-4xl font-extrabold">${plan.price_monthly}</span>
                    <span className="text-slate-400">/mo</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-sm text-slate-600"><Check className="w-4 h-4 text-emerald-600" />Up to {plan.max_players} players</li>
                    <li className="flex items-center gap-2 text-sm text-slate-600"><Check className="w-4 h-4 text-emerald-600" />Up to {plan.max_branches} branches</li>
                    <li className="flex items-center gap-2 text-sm text-slate-600"><Check className="w-4 h-4 text-emerald-600" />Up to {plan.max_teams} teams</li>
                    {plan.features?.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-600"><Check className="w-4 h-4 text-emerald-600" />{f}</li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isPro ? "default" : "outline"}
                    disabled={isCurrent || checkingOut === plan.tier}
                    onClick={() => checkout(plan.tier)}
                  >
                    {checkingOut === plan.tier ? <Loader2 className="w-4 h-4 animate-spin" /> : isCurrent ? "Current plan" : `Choose ${plan.tier}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}