import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CreditCard, DollarSign, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PricingConfigPanel from "@/components/saas/PricingConfigPanel";

const STATUS_COLORS = {
  paid: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  canceled: "bg-rose-100 text-rose-700",
};

export default function BillingTab({ clubs, plans }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Base44Purchase.list("-created_date", 200)
      .then(setPurchases)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const clubName = (id) => clubs.find((c) => c.id === id)?.name || "—";
  const planPrice = (tier) => plans.find((p) => p.tier === tier)?.price_monthly || 0;

  const mrr = clubs.filter((c) => c.subscription_status === "active").reduce((s, c) => s + planPrice(c.plan_tier), 0);
  const activeSubs = clubs.filter((c) => c.subscription_status === "active").length;
  const totalRevenue = purchases.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatMini icon={DollarSign} label="MRR" value={`$${mrr.toFixed(0)}`} tone="amber" />
        <StatMini icon={TrendingUp} label="Active Subscriptions" value={activeSubs} tone="emerald" />
        <StatMini icon={CreditCard} label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} tone="indigo" />
      </div>

      <Card>
        <CardHeader><CardTitle>Subscription Billing by Club</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b">
                  <th className="py-2 font-semibold">Club</th><th className="py-2 font-semibold">Plan</th><th className="py-2 font-semibold">Price/mo</th><th className="py-2 font-semibold">Sub Status</th><th className="py-2 font-semibold">Club Status</th>
                </tr>
              </thead>
              <tbody>
                {clubs.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 font-semibold">{c.name}</td>
                    <td className="py-3 capitalize">{c.plan_tier}</td>
                    <td className="py-3">${planPrice(c.plan_tier).toFixed(0)}</td>
                    <td className="py-3"><Badge variant="outline">{c.subscription_status || "pending"}</Badge></td>
                    <td className="py-3"><Badge className={c.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100"}>{c.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <PricingConfigPanel />

      <Card>
        <CardHeader><CardTitle>Recent Purchases</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
          ) : purchases.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No purchases yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b">
                    <th className="py-2 font-semibold">Date</th><th className="py-2 font-semibold">Club</th><th className="py-2 font-semibold">Plan</th><th className="py-2 font-semibold">Amount</th><th className="py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.slice(0, 20).map((p) => (
                    <tr key={p.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 text-slate-500">{new Date(p.created_date).toLocaleDateString()}</td>
                      <td className="py-3">{clubName(p.club_id)}</td>
                      <td className="py-3 capitalize">{p.plan_tier || "—"}</td>
                      <td className="py-3 font-semibold">${Number(p.amount || 0).toFixed(2)} {p.currency || ""}</td>
                      <td className="py-3"><Badge className={STATUS_COLORS[p.status] || "bg-slate-100"}>{p.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatMini({ icon: Icon, label, value, tone }) {
  const tones = { indigo: "bg-indigo-100 text-indigo-700", emerald: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700" };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}><Icon className="w-5 h-5" /></div>
        <div><div className="text-2xl font-extrabold">{value}</div><div className="text-xs text-slate-400">{label}</div></div>
      </CardContent>
    </Card>
  );
}